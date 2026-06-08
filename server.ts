import express from 'express';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

import {
  syncTeacherListFromSupabase,
  updateCachedTeachers,
  addTeacherToCache,
  removeTeacherFromCache,
  updateTeacherInCache,
  resetTeacherPasswordInCache,
  appendAttendanceToSheets
} from './server/sheets';

import {
  dbGetCalendar,
  dbAddAttendance,
  dbGetAttendance,
  dbAddCorrection,
  dbGetCorrections,
  dbUpdateCorrection,
  dbAddAuditLog,
  dbGetAuditLogs,
  dbGetTeachers,
  dbCreateTeacher,
  dbUpdateTeacher,
  dbDeleteTeacher,
  dbResetTeacherPassword,
  clientSupabaseConfig,
  isSupabaseConnected,
  supabase
} from './server/supabase';

import { evaluateSchoolStatus } from './server/calendar';
import { generateExecutiveAIInsight } from './server/gemini';
import { Teacher, AttendanceRecord, AttendanceCorrection } from './src/types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'STAS_AL_WILDAN_SUPER_SECRET_KEY';
const QR_SIGN_KEY = 'STAS_QR_BSD_SIGN_KEY';

app.use(express.json({ limit: '10mb' }));

// Helper to sign QR Level 2: EMP001|SHA256_HASH
export function generateQRValue(id: string): string {
  const hash = crypto.createHash('sha256').update(id + QR_SIGN_KEY).digest('hex');
  return `${id}|${hash}`;
}

// Geofence helper (Haversine distance)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Returns distance in meters
}

// Middlewares
function getClientIp(req: express.Request): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  return typeof ip === 'string' ? ip.split(',')[0].trim() : String(ip);
}

const verifyToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi kehadiran tidak valid. Silakan masuk kembali.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesi kehadiran kadaluarsa. Silakan masuk kembali.' });
  }
};

// Seed teachers on startup from Supabase / Sheets fallback
syncTeacherListFromSupabase().then((teachers) => {
  console.log("MASTER_GURU COUNT:", teachers.length);
});

// ==========================================
// API ENDPOINTS
// ==========================================

// Config Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    schoolLocation: {
      latitude: -6.3135,
      longitude: 106.6947,
      radius: 50 // 50 Meters geofence
    },
    supabaseConfig: clientSupabaseConfig,
    isRealDb: isSupabaseConnected
  });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: 'ID Guru dan sandi wajib diisi.' });
  }

  try {
    console.log("LOGIN USING FIRESTORE");
    const teachers = await dbGetTeachers();

    const teacher = teachers.find((t) => t && t.id && typeof t.id === 'string' && t.id.toLowerCase() === id.toLowerCase().trim() && t.isActive);

    console.log("LOGIN INPUT:", id);
    console.log("AVAILABLE IDS:", teachers.map(t => t.id));
    console.log("FOUND TEACHER:", teacher);

    if (!teacher) {
      await dbAddAuditLog({
        userId: id.trim(),
        action: 'LOGIN_FAILURE',
        description: `Percobaan masuk gagal: ID "${id}" tidak terdaftar atau dinonaktifkan.`,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIp(req)
      });
      return res.status(401).json({ error: 'ID Guru tidak terdaftar atau dinonaktifkan.' });
    }

    if (!teacher.passwordHash) {
      console.error(`LOGIN ERROR: Teacher "${teacher.id}" exists but lacks passwordHash!`);
      await dbAddAuditLog({
        userId: teacher.id,
        action: 'LOGIN_FAILURE',
        description: `Percobaan masuk gagal untuk ${teacher.name} (${teacher.id}): Sandi belum di-set di Supabase.`,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIp(req)
      });
      return res.status(401).json({ error: 'Sandi belum dikonfigurasi untuk akun ini. Silakan hubungi admin sekolah.' });
    }

    let isMatch = bcrypt.compareSync(password, teacher.passwordHash);
    if (!isMatch) {
      // Case-insensitive/trim fallback check (important for default ID-based passwords like T2026/tugas)
      isMatch = bcrypt.compareSync(password.toLowerCase().trim(), teacher.passwordHash);
    }

    console.log("LOGIN USER SUCCESS MATCH:", teacher.id);
    console.log("BCRYPT RESULT:", isMatch);

    if (!isMatch) {
       await dbAddAuditLog({
        userId: teacher.id,
        action: 'LOGIN_FAILURE',
        description: `Percobaan masuk gagal untuk ${teacher.name} (${teacher.id}): Sandi salah.`,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIp(req)
      });
      return res.status(401).json({ error: 'Sandi salah. Silakan coba kembali.' });
    }

    // Determine if user has default password (forces password change)
    const isFirstLogin = password.toLowerCase().trim() === teacher.id.toLowerCase().trim();

    const token = jwt.sign(
      {
        id: teacher.id,
        name: teacher.name,
        role: teacher.role,
        commission: teacher.commission,
        mustChangePassword: teacher.mustChangePassword || isFirstLogin
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Dynamic QR Token (Enterprise) - 4 hours expiry
    const nowSecs = Math.floor(Date.now() / 1000);
    const expiresSecs = nowSecs + 4 * 60 * 60; // 4 Hours
    const qrPayload = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      role: teacher.role,
      issuedAt: nowSecs,
      expiresAt: expiresSecs
    };
    const qrToken = jwt.sign(qrPayload, JWT_SECRET);
    const qrIssuedAtStr = new Date(nowSecs * 1000).toISOString();
    const qrExpiredAtStr = new Date(expiresSecs * 1000).toISOString();

    // Update in database and in-memory cache
    await dbUpdateTeacher(teacher.id, {
      currentQrToken: qrToken,
      qrIssuedAt: qrIssuedAtStr,
      qrExpiredAt: qrExpiredAtStr
    });
    updateTeacherInCache(teacher.id, {
      currentQrToken: qrToken,
      qrIssuedAt: qrIssuedAtStr,
      qrExpiredAt: qrExpiredAtStr
    });

    await dbAddAuditLog({
      userId: teacher.id,
      action: 'LOGIN',
      description: `${teacher.name} (${teacher.role}) berhasil masuk ke sistem STAS.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    await dbAddAuditLog({
      userId: teacher.id,
      action: 'QR_GENERATED',
      description: `Token QR Dinamis baru di-generate untuk ${teacher.name} (${teacher.id}) berlaku selama 4 jam.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({
      token,
      user: {
        id: teacher.id,
        name: teacher.name,
        role: teacher.role,
        commission: teacher.commission,
        mustChangePassword: teacher.mustChangePassword || isFirstLogin,
        qrValue: teacher.qrValue,
        currentQrToken: qrToken,
        qrIssuedAt: qrIssuedAtStr,
        qrExpiredAt: qrExpiredAtStr
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/change-password', verifyToken, async (req: any, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Sandi baru minimal berukuran 4 karakter.' });
  }

  try {
    const hashed = bcrypt.hashSync(newPassword, 10);
    await dbUpdateTeacher(req.user.id, { passwordHash: hashed, mustChangePassword: false });
    updateTeacherInCache(req.user.id, { passwordHash: hashed, mustChangePassword: false });

    await dbAddAuditLog({
      userId: req.user.id,
      action: 'PASSWORD_CHANGE',
      description: `Guru mengubah sandi default untuk peningkatan keamanan MFA.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', verifyToken, async (req: any, res) => {
  try {
    const teachers = await dbGetTeachers();
    const teacher = teachers.find(t => t.id === req.user.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Profil pengajar tidak ditemukan.' });
    }

    // Fallback: If they have a valid session but no token or if their existing token has expired
    let qrToken = teacher.currentQrToken;
    let qrIssuedAtStr = teacher.qrIssuedAt;
    let qrExpiredAtStr = teacher.qrExpiredAt;

    const currentSecs = Math.floor(Date.now() / 1000);
    let needsNewToken = !qrToken;

    if (qrToken) {
      try {
        const decoded: any = jwt.verify(qrToken, JWT_SECRET);
        if (decoded.expiresAt && currentSecs > decoded.expiresAt) {
          needsNewToken = true;
        }
      } catch (err) {
        needsNewToken = true;
      }
    }

    if (needsNewToken) {
      const nowSecs = Math.floor(Date.now() / 1000);
      const expiresSecs = nowSecs + 4 * 60 * 60; // 4 Hours
      const qrPayload = {
        teacherId: teacher.id,
        teacherName: teacher.name,
        role: teacher.role,
        issuedAt: nowSecs,
        expiresAt: expiresSecs
      };
      qrToken = jwt.sign(qrPayload, JWT_SECRET);
      qrIssuedAtStr = new Date(nowSecs * 1000).toISOString();
      qrExpiredAtStr = new Date(expiresSecs * 1000).toISOString();

      await dbUpdateTeacher(teacher.id, {
        currentQrToken: qrToken,
        qrIssuedAt: qrIssuedAtStr,
        qrExpiredAt: qrExpiredAtStr
      });
      updateTeacherInCache(teacher.id, {
        currentQrToken: qrToken,
        qrIssuedAt: qrIssuedAtStr,
        qrExpiredAt: qrExpiredAtStr
      });

      await dbAddAuditLog({
        userId: teacher.id,
        action: 'QR_GENERATED',
        description: `Token QR Dinamis baru di-generate otomatis via session restore untuk ${teacher.name} (${teacher.id}) berlaku selama 4 jam.`,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIp(req)
      });
    }

    res.json({
      id: teacher.id,
      name: teacher.name,
      role: teacher.role,
      commission: teacher.commission,
      mustChangePassword: teacher.mustChangePassword,
      qrValue: teacher.qrValue,
      currentQrToken: qrToken,
      qrIssuedAt: qrIssuedAtStr,
      qrExpiredAt: qrExpiredAtStr
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', verifyToken, async (req: any, res) => {
  try {
    const teacherId = req.user.id;
    await dbUpdateTeacher(teacherId, {
      currentQrToken: null,
      qrIssuedAt: null,
      qrExpiredAt: null
    });
    updateTeacherInCache(teacherId, {
      currentQrToken: null,
      qrIssuedAt: null,
      qrExpiredAt: null
    });

    await dbAddAuditLog({
      userId: teacherId,
      action: 'LOGOUT',
      description: `Guru managed to log out. Token QR Dinamis diaktifkan sebelumnya telah dihapus dari sistem.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Keluar berhasil dan QR dinamis dinonaktifkan.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Teacher CRUD
app.get('/api/teachers', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Akses terbatas untuk administrator saja.' });
  }
  try {
    const teachers = await dbGetTeachers();
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta CRUD hanya dimiliki oleh Super Admin.' });
  }

  const { id, name, commission, role } = req.body;
  if (!id || !name || !commission || !role) {
    return res.status(400).json({ error: 'Formulir guru baru belum lengkap.' });
  }

  try {
    const teachers = await dbGetTeachers();
    if (teachers.some(t => t.id.toLowerCase() === id.toLowerCase().trim())) {
      return res.status(400).json({ error: 'ID Guru sudah terdaftar di sistem.' });
    }

    const defaultPassword = id.toLowerCase().trim(); // Default password = Employee ID (lowercase)
    const defaultHash = bcrypt.hashSync(defaultPassword, 10);
    const qrVal = generateQRValue(id);

    const newTeacher: Teacher = {
      id: id.trim(),
      name: name.trim(),
      passwordHash: defaultHash,
      role: role,
      commission: commission.trim(),
      qrValue: qrVal,
      isActive: true,
      mustChangePassword: true
    };

    console.log("NEW TEACHER CREATED:", newTeacher);

    // 1. Save permanently to Supabase
    await dbCreateTeacher(newTeacher);

    // 2. Update local cache
    addTeacherToCache(newTeacher);

    // 3. Write audit log
    await dbAddAuditLog({
      userId: req.user.id,
      action: 'CRUD_CREATE',
      description: `Super Admin menambahkan guru baru: ${name} (${id})`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json(newTeacher);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/bulk-upload', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta bulk upload hanya dimiliki oleh Super Admin.' });
  }

  const { teachers } = req.body;
  if (!Array.isArray(teachers)) {
    return res.status(400).json({ error: 'Data guru massal tidak valid.' });
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  try {
    const dbTeachers = await dbGetTeachers();
    const existingIds = new Set(dbTeachers.map(t => t.id.toLowerCase().trim()));

    let existingEmails = new Set<string>();

    if (isSupabaseConnected && supabase) {
      try {
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
          perPage: 1000
        });
        if (!listError && authUsers?.users) {
          authUsers.users.forEach((u: any) => {
            if (u.email) existingEmails.add(u.email.toLowerCase().trim());
          });
        }
      } catch (e) {
        console.warn('STAS Bulk Upload Check: Could not list auth users, falling back to local memory check.', e);
      }
    }

    const batchEmails = new Set<string>();
    const batchIds = new Set<string>();

    for (const rawTeacher of teachers) {
      const id = String(rawTeacher.id || '').trim();
      const name = String(rawTeacher.name || '').trim();
      const commission = String(rawTeacher.commission || '').trim();
      let email = String(rawTeacher.email || '').toLowerCase().trim();

      // Email is optional, auto-generate default based on teacher ID if empty
      if (!email) {
        email = `${id.toLowerCase()}@alwildan3bsd.sch.id`;
      }

      let roleVal: 'SUPER_ADMIN' | 'ADMIN' | 'GURU' | 'KEPALA_SEKOLAH' = 'GURU';
      const rawRole = String(rawTeacher.role || '').toUpperCase().trim();
      if (rawRole === 'SUPER_ADMIN' || rawRole === 'ADMIN' || rawRole === 'GURU' || rawRole === 'KEPALA_SEKOLAH') {
        roleVal = rawRole;
      }

      if (!id || !name || !commission) {
        failCount++;
        errors.push(`Baris "${name || 'Guru Tanpa Nama'}": Informasi tidak lengkap (ID, Nama, dan Komisi wajib diisi).`);
        continue;
      }

      const idLower = id.toLowerCase();

      if (existingIds.has(idLower) || batchIds.has(idLower)) {
        failCount++;
        errors.push(`ID Guru "@${id}" sudah terdaftar di sistem (Baris dilewati).`);
        continue;
      }

      if (existingEmails.has(email) || batchEmails.has(email)) {
        failCount++;
        errors.push(`Email "${email}" sudah digunakan (Baris dilewati).`);
        continue;
      }

      const defaultPassword = id.toLowerCase();
      const defaultHash = bcrypt.hashSync(defaultPassword, 10);
      const qrVal = generateQRValue(id);

      const newTeacher: Teacher = {
        id: id,
        name: name,
        passwordHash: defaultHash,
        role: roleVal,
        commission: `${commission} | Email: ${email}`,
        qrValue: qrVal,
        isActive: true,
        mustChangePassword: true
      };

      try {
        if (isSupabaseConnected && supabase) {
          const { error: signUpError } = await supabase.auth.admin.createUser({
            email: email,
            password: id,
            user_metadata: { name: name, id: id },
            email_confirm: true
          });
          if (signUpError) {
            console.error(`Auth signup failed for ${email}:`, signUpError);
            failCount++;
            errors.push(`Gagal mendaftarkan email "${email}" di Supabase Auth: ${signUpError.message}`);
            continue;
          }
        }

        await dbCreateTeacher(newTeacher);
        addTeacherToCache(newTeacher);

        successCount++;
        batchEmails.add(email);
        batchIds.add(idLower);

      } catch (err: any) {
        failCount++;
        errors.push(`Gagal menyimpan ${name}: ${err.message}`);
      }
    }

    await dbAddAuditLog({
      userId: req.user.id,
      action: 'CRUD_CREATE',
      description: `Bulk upload berhasil mengimpor ${successCount} guru, dilewati/gagal ${failCount}.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({
      success: true,
      successCount,
      failCount,
      errors
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teachers/:id', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta CRUD hanya dimiliki oleh Super Admin.' });
  }

  const { name, commission, role, isActive } = req.body;
  try {
    const id = req.params.id;
    const teachersList = await dbGetTeachers();
    const existingTeacher = teachersList.find(t => t.id === id);

    let actionStr = 'CRUD_UPDATE';
    let descStr = `Super Admin memperbarui guru ID ${id}`;

    if (existingTeacher && isActive !== undefined && existingTeacher.isActive !== isActive) {
      actionStr = isActive ? 'TEACHER_ACTIVATE' : 'TEACHER_DEACTIVATE';
      descStr = `Super Admin ${isActive ? 'mengaktifkan' : 'menonaktifkan'} guru: ${existingTeacher.name} (${id})`;
    }

    // 1. Update Supabase permanently
    await dbUpdateTeacher(id, { name, commission, role, isActive });

    // 2. Update cache
    updateTeacherInCache(id, { name, commission, role, isActive });

    // 3. Audit Log
    await dbAddAuditLog({
      userId: req.user.id,
      action: actionStr,
      description: descStr,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teachers/:id', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta CRUD hanya dimiliki oleh Super Admin.' });
  }

  try {
    const id = req.params.id;
    const teachersList = await dbGetTeachers();
    const existingTeacher = teachersList.find(t => t.id === id);
    const teacherName = existingTeacher ? existingTeacher.name : id;

    // 1. Delete Supabase permanently
    await dbDeleteTeacher(id);

    // 2. Update cache
    removeTeacherFromCache(id);

    // 3. Audit Log
    await dbAddAuditLog({
      userId: req.user.id,
      action: 'CRUD_DELETE',
      description: `Super Admin menghapus guru: ${teacherName} (${id})`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/:id/reset-password', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta Reset Sandi hanya dimiliki oleh Super Admin.' });
  }

  try {
    const id = req.params.id;

    // 1. Reset password in Supabase permanently
    await dbResetTeacherPassword(id);

    // 2. Reset in cache
    resetTeacherPasswordInCache(id);

    // 3. Audit Log
    await dbAddAuditLog({
      userId: req.user.id,
      action: 'RESET_PASSWORD',
      description: `Melakukan reset sandi untuk Guru ID ${id}. Kembali ke kata sandi awal (ID Guru).`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, message: 'Password reset to default matching ID.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar Engine Endpoint
app.get('/api/calendar/status', async (req, res) => {
  try {
    const events = await dbGetCalendar();
    const result = evaluateSchoolStatus(events);
    res.json({
      status: result.status,
      activeEvent: result.activeEvent,
      events
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Attendance Check-In Check-Out Processing Engine
app.post('/api/attendance/check', verifyToken, async (req: any, res) => {
  const { latitude, longitude, accuracy, checkType, qrValue, deviceInfo, attendanceMode } = req.body;

  if (!checkType || !['CHECK_IN', 'CHECK_OUT'].includes(checkType)) {
    return res.status(400).json({ error: 'Tipe absensi (Check In / Check Out) tidak sah.' });
  }

  try {
    // 1. Evaluate Calendar Status
    const events = await dbGetCalendar();
    const calendarEval = evaluateSchoolStatus(events);

    if (calendarEval.status === 'LIBUR') {
      return res.status(400).json({
        error: `Absensi tidak tersedia. Hari ini diliburkan untuk: ${calendarEval.activeEvent?.kegiatan || 'Aktivitas Libur'}`
      });
    }

    const isWFH = calendarEval.status === 'WFH';

    // 2. Validate GPS Coordinates (Except during WFH)
    let finalDistance = 0;
    if (!isWFH && attendanceMode !== 'QR Only') {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Sinyal GPS terputus. Harap izinkan pelacakan lokasi akurasi tinggi.' });
      }
      if (accuracy > 100) {
        return res.status(400).json({ error: 'GPS tidak valid. Aktifkan lokasi akurasi tinggi (Akurasi GPS saat ini > 100m).' });
      }

      // Al-Wildan 3 BSD coordinates: -6.3135, 106.6947
      finalDistance = calculateDistance(latitude, longitude, -6.3135, 106.6947);

      if (finalDistance > 50) {
        return res.status(400).json({
          error: `Lokasi Anda berada di luar cakupan sekolah Al-Wildan BSD (${Math.round(finalDistance)} meter). Geofence radius limit: 50 Meter.`
        });
      }
    }

    // 3. Validate QR (For QR Only or GPS + QR modes, WFH maintains mandatory QR scan!)
    if (attendanceMode === 'GPS + QR' || attendanceMode === 'QR Only' || isWFH) {
      if (!qrValue) {
        return res.status(400).json({ error: 'Pemindaian kartu QR Sekolah wajib diselesaikan.' });
      }

      // Verify if it is a valid JWT token
      let qrPayload: any = null;
      try {
        qrPayload = jwt.verify(qrValue, JWT_SECRET);
      } catch (jwtErr: any) {
        let errorMsg = 'Audit QR Gagal. Token tidak valid atau rusak.';
        let actionLog = 'QR_SCAN_REJECTED';
        
        if (jwtErr && jwtErr.name === 'TokenExpiredError') {
          errorMsg = 'QR telah kedaluwarsa. Silakan login kembali.';
          actionLog = 'QR_EXPIRED';
        }

        await dbAddAuditLog({
          userId: req.user.id,
          action: actionLog,
          description: `Percobaan scan QR ditolak untuk ${req.user.name} (${req.user.id}): ${jwtErr.message || jwtErr}`,
          timestamp: new Date().toISOString(),
          ipAddress: getClientIp(req)
        });

        if (actionLog === 'QR_EXPIRED') {
          await dbAddAuditLog({
            userId: req.user.id,
            action: 'QR_SCAN_REJECTED',
            description: `Scan QR Gagal karena token sudah kedaluwarsa.`,
            timestamp: new Date().toISOString(),
            ipAddress: getClientIp(req)
          });
        }

        return res.status(400).json({ error: errorMsg });
      }

      // Extra safety checks from payload
      if (!qrPayload || qrPayload.teacherId !== req.user.id) {
        await dbAddAuditLog({
          userId: req.user.id,
          action: 'QR_SCAN_REJECTED',
          description: `Percobaan scan QR ditolak: ID Pengajar di QR (${qrPayload?.teacherId || 'tidak ada'}) tidak sesuai dengan pengajar aktif (${req.user.id}).`,
          timestamp: new Date().toISOString(),
          ipAddress: getClientIp(req)
        });
        return res.status(400).json({ error: 'Audit QR Gagal. Kartu QR bukan milik Anda.' });
      }

      // Check current active token rotation in database (the stored token in Supabase must match the scanned token)
      const teachersList = await dbGetTeachers();
      const currentTeacher = teachersList.find(t => t.id === req.user.id);

      if (!currentTeacher || currentTeacher.currentQrToken !== qrValue) {
        await dbAddAuditLog({
          userId: req.user.id,
          action: 'QR_SCAN_REJECTED',
          description: `Scan QR ditolak karena token tidak lagi aktif (sudah di-rotasi atau dimatikan oleh logout).`,
          timestamp: new Date().toISOString(),
          ipAddress: getClientIp(req)
        });
        return res.status(400).json({ error: 'Audit QR Gagal. QR Code ini sudah tidak berlaku karena Anda telah melakukan login terpisah atau token telah di-reset.' });
      }

      // Check explicit expiration time in payload
      const currentSecs = Math.floor(Date.now() / 1000);
      if (qrPayload.expiresAt && currentSecs > qrPayload.expiresAt) {
        await dbAddAuditLog({
          userId: req.user.id,
          action: 'QR_EXPIRED',
          description: `Audit QR Gagal: Token melebihi batas waktu 4 jam.`,
          timestamp: new Date().toISOString(),
          ipAddress: getClientIp(req)
        });
        await dbAddAuditLog({
          userId: req.user.id,
          action: 'QR_SCAN_REJECTED',
          description: `Scan QR Gagal karena token sudah kedaluwarsa.`,
          timestamp: new Date().toISOString(),
          ipAddress: getClientIp(req)
        });
        return res.status(400).json({ error: 'QR telah kedaluwarsa. Silakan login kembali.' });
      }
    }

    // 4. Double Check Protection
    const currentList = await dbGetAttendance();
    const todayStrInLocal = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    const hasDoubleRecord = currentList.some((record) => {
      const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
      return record.teacherId === req.user.id && record.checkType === checkType && recordDate === todayStrInLocal;
    });

    if (hasDoubleRecord) {
      return res.status(400).json({
        error: `Anti-Fraud: Anda terdeteksi sudah melakukan ${checkType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} untuk hari ini.`
      });
    }

    // 5. Evaluate Work Hours / Attendance Status
    const today = new Date();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    let recordStatus: AttendanceRecord['status'] = 'HADIR';

    if (checkType === 'CHECK_IN') {
      // Jam Kerja Senin - Jumat. Masuk 07.00 - 07.07 (Hadir), selebihnya terlambat
      if (currentHour > 7 || (currentHour === 7 && currentMinute > 7)) {
        recordStatus = 'TERLAMBAT';
      }
    } else {
      // Pulang Jam 16:00. < 16:00 status PULANG_CEPAT
      if (currentHour < 16) {
        recordStatus = 'PULANG_CEPAT';
      }
    }

    const newRecord: AttendanceRecord = {
      id: `rc-${Date.now()}-${Math.random().toString(36).substring(3, 8)}`,
      teacherId: req.user.id,
      teacherName: req.user.name,
      role: req.user.role,
      timestamp: today.toISOString(),
      latitude: latitude || -6.3135,
      longitude: longitude || 106.6947,
      distance: finalDistance,
      attendanceMode: isWFH ? 'QR Only (WFH MODE)' : attendanceMode || 'GPS + QR',
      checkType: checkType,
      status: recordStatus,
      deviceInfo: deviceInfo || 'STAS Client App v1',
      createdAt: today.toISOString()
    };

    // Save to Supabase & Append directly to Sheet2!
    await dbAddAttendance(newRecord);
    await appendAttendanceToSheets(newRecord);

    const isQrCheck = attendanceMode === 'GPS + QR' || attendanceMode === 'QR Only' || isWFH;
    if (isQrCheck) {
      await dbAddAuditLog({
        userId: req.user.id,
        action: 'QR_SCAN_SUCCESS',
        description: `Pemindaian QR Dinamis untuk ${req.user.name} terverifikasi sukses.`,
        timestamp: today.toISOString(),
        ipAddress: getClientIp(req)
      });
    }

    await dbAddAuditLog({
      userId: req.user.id,
      action: checkType,
      description: `Guru menyelesaikan absensi ${checkType} dengan status ${recordStatus}. (${isWFH ? 'WFH Mode' : `Akurasi GPS: ${accuracy || 0}m`})`,
      timestamp: today.toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({
      success: true,
      record: newRecord
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Corrections Endpoint
app.post('/api/attendance/correction', verifyToken, async (req: any, res) => {
  const { correctionDate, type, reason, attachment } = req.body;
  if (!correctionDate || !type || !reason) {
    return res.status(400).json({ error: 'Kelengkapan isian koreksi belum terpenuhi.' });
  }

  // Grace verification period: maximum 3 days back as instructed
  const targetDate = new Date(correctionDate);
  const diffTime = Math.abs(new Date().getTime() - targetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 3) {
    return res.status(400).json({ error: 'Koreksi ditolak. Batas pengajuan dispensasi absensi maksimal 3 hari kerja.' });
  }

  try {
    const correction: AttendanceCorrection = {
      id: `tc-${Date.now()}`,
      teacherId: req.user.id,
      teacherName: req.user.name,
      correctionDate,
      type,
      reason,
      attachment,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    await dbAddCorrection(correction);

    await dbAddAuditLog({
      userId: req.user.id,
      action: 'CORRECTION_SUBMIT',
      description: `Guru mengajukan surat koreksi absensi untuk tanggal ${correctionDate}.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json(correction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attendance/corrections', verifyToken, async (req: any, res) => {
  try {
    const list = await dbGetCorrections();
    // Return only self records if role is Guru, all if admin/kepsek
    if (req.user.role === 'GURU') {
      return res.json(list.filter(c => c.teacherId === req.user.id));
    }
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance/corrections/:id/approve', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Akses persetujuan dibatasi.' });
  }

  const { decision } = req.body; // 'APPROVED' or 'REJECTED'
  if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Keputusan approval tidak lengkap.' });
  }

  try {
    await dbUpdateCorrection(req.params.id, {
      status: decision,
      approvedBy: req.user.name
    });

    // If approved, we simulate the correction by injecting an approved record or logging a sync
    const correctionsList = await dbGetCorrections();
    const currCorrection = correctionsList.find(c => c.id === req.params.id);

    if (decision === 'APPROVED' && currCorrection) {
      // Craft simulated corrected record for historic clarity
      const corrRecord: AttendanceRecord = {
        id: `rc-corr-${Date.now()}`,
        teacherId: currCorrection.teacherId,
        teacherName: currCorrection.teacherName,
        role: 'GURU',
        timestamp: `${currCorrection.correctionDate}T07:00:00Z`,
        latitude: -6.3135,
        longitude: 106.6947,
        distance: 0,
        attendanceMode: 'GPS + QR',
        checkType: currCorrection.type === 'LUPA_CHECKIN' ? 'CHECK_IN' : 'CHECK_OUT',
        status: 'HADIR',
        deviceInfo: `System Manual Sync (Approved by Admin: ${req.user.name})`,
        createdAt: new Date().toISOString()
      };
      await dbAddAttendance(corrRecord);
      await appendAttendanceToSheets(corrRecord);
    }

    await dbAddAuditLog({
      userId: req.user.id,
      action: `CORRECTION_${decision}`,
      description: `Admin ${req.user.name} menyetujui/menolak koreksi absensi ID ${req.params.id}.`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Dashboard Summary Engine
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const teachers = await dbGetTeachers();
    const totalTeachers = teachers.filter(t => t.role === 'GURU').length;

    const attendances = await dbGetAttendance();
    const todayLocalStr = new Date().toISOString().split('T')[0];

    const todayRecords = attendances.filter(record => 
      new Date(record.timestamp).toISOString().split('T')[0] === todayLocalStr
    );

    const checkIns = todayRecords.filter(r => r.checkType === 'CHECK_IN');
    const checkOuts = todayRecords.filter(r => r.checkType === 'CHECK_OUT');

    const hadirCount = checkIns.filter(r => r.status === 'HADIR').length;
    const terlambatCount = checkIns.filter(r => r.status === 'TERLAMBAT').length;
    const pulangCepatCount = checkOuts.filter(r => r.status === 'PULANG_CEPAT').length;
    
    const activeCheckedInIds = new Set(checkIns.map(r => r.teacherId));
    const alphaCount = Math.max(0, totalTeachers - activeCheckedInIds.size);
    const belumCheckOutCount = Math.max(0, activeCheckedInIds.size - checkOuts.length);

    // Historic Trend Generation
    const last7Days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      
      const dayRecords = attendances.filter(r => 
        new Date(r.timestamp).toISOString().split('T')[0] === str && r.checkType === 'CHECK_IN'
      );
      
      const rate = totalTeachers > 0 ? (dayRecords.length / totalTeachers) * 100 : 100;
      last7Days.push({
        date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        rate: Math.round(rate)
      });
    }

    // Determine top discipline
    const teacherCheckInsCount: { [key: string]: { name: string, count: number } } = {};
    attendances.filter(r => r.checkType === 'CHECK_IN' && r.status === 'HADIR').forEach(r => {
      if (!teacherCheckInsCount[r.teacherId]) {
        teacherCheckInsCount[r.teacherId] = { name: r.teacherName, count: 0 };
      }
      teacherCheckInsCount[r.teacherId].count++;
    });

    let topDisciplineName = "Ust. Ahmad Fauzi, S.Pd.I";
    let maxPresent = 0;
    Object.keys(teacherCheckInsCount).forEach(tid => {
      if (teacherCheckInsCount[tid].count > maxPresent) {
        maxPresent = teacherCheckInsCount[tid].count;
        topDisciplineName = teacherCheckInsCount[tid].name;
      }
    });

    // Lazy load AI Insights on trigger
    const aiInsightMsg = await generateExecutiveAIInsight({
      totalTeachers,
      activeHadir: hadirCount,
      terlambatCount,
      pulangCepatCount,
      alphaCount,
      attendanceTrend: last7Days,
      topDiscipline: topDisciplineName
    });

    res.json({
      stats: {
        totalTeachers,
        hadir: hadirCount,
        terlambat: terlambatCount,
        pulangCepat: pulangCepatCount,
        belumCheckout: belumCheckOutCount,
        alpha: alphaCount
      },
      trends: last7Days,
      topDiscipline: topDisciplineName,
      aiInsight: aiInsightMsg,
      feed: todayRecords.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Stream
app.get('/api/audit-logs', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses log audit dibatasi.' });
  }
  try {
    const logs = await dbGetAuditLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Teacher Attendance Server bound and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
