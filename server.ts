import dotenv from 'dotenv';

dotenv.config({
  path: '.env.local'
});

console.log('JWT:', process.env.JWT_SECRET ? 'FOUND' : 'MISSING');
console.log('FIREBASE:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'FOUND' : 'MISSING');

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';

import {
  syncTeacherListFromSheets,
  getCachedTeachers,
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
  clientFirebaseConfig,
  isRealFirebaseConnected
} from './server/firebase';

import { evaluateSchoolStatus } from './server/calendar';
import { generateExecutiveAIInsight } from './server/gemini';
import { Teacher, AttendanceRecord, AttendanceCorrection } from './src/types';

const app = express();
const PORT = 3000;
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

// Seed teachers on startup from sheets/local
syncTeacherListFromSheets();

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
    firebaseConfig: clientFirebaseConfig,
    isRealDb: isRealFirebaseConnected
  });
});

// Auth endpoints
app.post('/api/auth/login', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: 'ID Guru dan sandi wajib diisi.' });
  }

  try {
    // Sync teachers from source
    const teachers = getCachedTeachers();
    const teacher = teachers.find((t) => t.id.toLowerCase() === id.toLowerCase().trim() && t.isActive);

    if (!teacher) {
      return res.status(401).json({ error: 'ID Guru tidak terdaftar atau dinonaktifkan.' });
    }

    const isMatch = bcrypt.compareSync(password, teacher.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Sandi salah. Silakan coba kembali.' });
    }

    // Determine if user has default password (forces password change)
    const isFirstLogin = password === teacher.id;

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

    await dbAddAuditLog({
      userId: teacher.id,
      action: 'LOGIN',
      description: `${teacher.name} (${teacher.role}) berhasil masuk ke sistem STAS.`,
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
        qrValue: teacher.qrValue
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

app.get('/api/auth/me', verifyToken, (req: any, res) => {
  const teachers = getCachedTeachers();
  const teacher = teachers.find(t => t.id === req.user.id);
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher profile not found.' });
  }
  res.json({
    id: teacher.id,
    name: teacher.name,
    role: teacher.role,
    commission: teacher.commission,
    mustChangePassword: teacher.mustChangePassword,
    qrValue: teacher.qrValue
  });
});

// Admin Teacher CRUD
app.get('/api/teachers', verifyToken, (req: any, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Akses terbatas untuk administrator saja.' });
  }
  res.json(getCachedTeachers());
});

app.post('/api/teachers', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta CRUD hanya dimiliki oleh Super Admin.' });
  }

  const { id, name, commission, role } = req.body;
  if (!id || !name || !commission || !role) {
    return res.status(400).json({ error: 'Formulir guru baru belum lengkap.' });
  }

  const teachers = getCachedTeachers();
  if (teachers.some(t => t.id.toLowerCase() === id.toLowerCase().trim())) {
    return res.status(400).json({ error: 'ID Guru sudah terdaftar di sistem.' });
  }

  try {
    const defaultPassword = id; // Default password = Employee ID
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

    addTeacherToCache(newTeacher);

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

app.put('/api/teachers/:id', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta CRUD hanya dimiliki oleh Super Admin.' });
  }

  const { name, commission, role, isActive } = req.body;
  try {
    updateTeacherInCache(req.params.id, { name, commission, role, isActive });

    await dbAddAuditLog({
      userId: req.user.id,
      action: 'CRUD_UPDATE',
      description: `Super Admin memperbarui guru ID ${req.params.id}`,
      timestamp: new Date().toISOString(),
      ipAddress: getClientIp(req)
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teachers/:id/reset-password', verifyToken, async (req: any, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Hak cipta Reset Sandi hanya dimiliki oleh Super Admin.' });
  }

  try {
    resetTeacherPasswordInCache(req.params.id);

    await dbAddAuditLog({
      userId: req.user.id,
      action: 'RESET_PASSWORD',
      description: `Melakukan reset sandi untuk Guru ID ${req.params.id}. Kembali ke kata sandi awal (ID Guru).`,
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
      // Level 2 Signature audit: decrypted QR value must verify
      const expectedQR = generateQRValue(req.user.id);
      if (qrValue !== expectedQR) {
        return res.status(400).json({ error: 'Audit QR Gagal. Kartu QR tidak cocok atau milik pengajar lain.' });
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

    // Save to Firestore & Append directly to Sheet2!
    await dbAddAttendance(newRecord);
    await appendAttendanceToSheets(newRecord);

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
    const teachers = getCachedTeachers();
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
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_HMR !== 'true') {
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
    console.log(`STAS Enterprise Server bound and running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
