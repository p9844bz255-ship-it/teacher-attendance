import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { CalendarEvent, AttendanceRecord, AttendanceCorrection, AuditLog, Teacher } from '../src/types';

// Supabase Configuration - Priority from environment variables, fallback to user-provided keys
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cncpzhzuyvatbnidhpxz.supabase.co';
// Using Service Role Key on backend to bypass Row Level Security constraints safely
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuY3B6aHp1eXZhdGJuaWRocHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc4NzE4OCwiZXhwIjoyMDk2MzYzMTg4fQ.2qxyxpOH1SI4Yv24CD4Chp-r7Lp49S-pda9lOq1XU-8';

let supabase: any = null;
let isSupabaseConnected = false; // Mapped to represents Supabase connection stat

try {
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    isSupabaseConnected = true;
    console.log('STAS Supabase Engine: Initialized successfully using PostgreSQL backend.');
  }
} catch (error) {
  console.error('STAS Supabase Engine: Failed to initialize Supabase client:', error);
}

// ==========================================
// ROBUST FULL-STACK LOCAL PERSISTENCY ENGINES (FALLBACK & SEED DATA)
// ==========================================

const INITIAL_CALENDAR: CalendarEvent[] = [
  {
    bulan: 'Juni',
    tanggal: '10',
    tanggal_full: '10 Juni 2026',
    kegiatan: 'Rapat Kerja Umum Guru & WFH',
    kegiatan_lower: 'rapat kerja umum guru & wfh'
  },
  {
    bulan: 'Juni',
    tanggal: '15 - 18',
    tanggal_full: '15 - 18 Juni 2026',
    kegiatan: 'Libur Hari Raya Idul Adha 1447H',
    kegiatan_lower: 'libur hari raya idul adha 1447h'
  },
  {
    bulan: 'Juni',
    tanggal: '20 - 30',
    tanggal_full: '20 - 30 Juni 2026',
    kegiatan: 'Libur Akhir Semester Genap',
    kegiatan_lower: 'libur akhir semester genap'
  },
  {
    bulan: 'Juli',
    tanggal: '1 - 3',
    tanggal_full: '1 - 3 Juli 2026',
    kegiatan: 'Libur Semester 2',
    kegiatan_lower: 'libur semester 2'
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    teacherId: 'EMP001',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd.I',
    role: 'GURU',
    timestamp: '2026-06-05T07:02:11Z',
    latitude: -6.31345,
    longitude: 106.69468,
    distance: 4.2,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_IN',
    status: 'HADIR',
    deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
    createdAt: '2026-06-05T07:02:11Z'
  },
  {
    id: 'att-2',
    teacherId: 'EMP001',
    teacherName: 'Ust. Ahmad Fauzi, S.Pd.I',
    role: 'GURU',
    timestamp: '2026-06-05T16:05:00Z',
    latitude: -6.31348,
    longitude: 106.69472,
    distance: 3.1,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_OUT',
    status: 'HADIR',
    deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
    createdAt: '2026-06-05T16:05:00Z'
  },
  {
    id: 'att-3',
    teacherId: 'EMP002',
    teacherName: 'Ustd. Sarah Amelia, S.S.',
    role: 'GURU',
    timestamp: '2026-06-05T07:15:32Z',
    latitude: -6.31339,
    longitude: 106.69460,
    distance: 13.5,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_IN',
    status: 'TERLAMBAT',
    deviceInfo: 'Mozilla/5.0 (Linux; Android 13; SM-S901B)',
    createdAt: '2026-06-05T07:15:32Z'
  },
  {
    id: 'att-4',
    teacherId: 'EMP002',
    teacherName: 'Ustd. Sarah Amelia, S.S.',
    role: 'GURU',
    timestamp: '2026-06-05T16:02:15Z',
    latitude: -6.31340,
    longitude: 106.69465,
    distance: 11.2,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_OUT',
    status: 'HADIR',
    deviceInfo: 'Mozilla/5.0 (Linux; Android 13; SM-S901B)',
    createdAt: '2026-06-05T16:02:15Z'
  }
];

const INITIAL_CORRECTIONS: AttendanceCorrection[] = [
  {
    id: 'corr-1',
    teacherId: 'EMP002',
    teacherName: 'Ustd. Sarah Amelia, S.S.',
    correctionDate: '2026-06-04',
    type: 'GPS_ERROR',
    reason: 'GPS Akurasi rendah di lapangan upacara sehingga memblokir absen biasa.',
    status: 'PENDING',
    createdAt: '2026-06-04T10:00:00Z'
  }
];

const INITIAL_AUDITS: AuditLog[] = [
  {
    id: 1,
    userId: 'SYSTEM',
    action: 'INIT',
    description: 'Smart Teacher Attendance System (STAS) Core Bootstrapped with Postgres (Supabase).',
    timestamp: '2026-06-06T03:30:00Z',
    ipAddress: '127.0.0.1'
  }
];

const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'admin',
    name: 'Super Admin STAS',
    passwordHash: bcrypt.hashSync('lessonplan', 10),
    role: 'SUPER_ADMIN',
    commission: 'Management',
    qrValue: 'admin|SYSTEM_ADMIN_QR_SECRET_MD5',
    isActive: true,
    mustChangePassword: false
  },
  {
    id: 'SUPER001',
    name: 'Super Admin STAS Legacy',
    passwordHash: bcrypt.hashSync('SUPER001', 10),
    role: 'SUPER_ADMIN',
    commission: 'Direktorat Akademi',
    qrValue: 'SUPER001|SYSTEM_ADMIN_QR_SECRET_MD5',
    isActive: true,
    mustChangePassword: true
  },
  {
    id: 'ADM001',
    name: 'Admin Al-Wildan BSD',
    passwordHash: bcrypt.hashSync('ADM001', 10),
    role: 'ADMIN',
    commission: 'Humas & Kesiswaan',
    qrValue: 'ADM001|SYSTEM_WRITER_QR_SECRET_MD5',
    isActive: true,
    mustChangePassword: true
  }
];

let memoryCalendar: CalendarEvent[] = [...INITIAL_CALENDAR];
let memoryAttendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
let memoryCorrections: AttendanceCorrection[] = [...INITIAL_CORRECTIONS];
let memoryAudits: AuditLog[] = [...INITIAL_AUDITS];
let memoryTeachers: Teacher[] = [...INITIAL_TEACHERS];

// ==========================================
// DYNAMIC TABLES AUTO-PREPOPULATING ON RUNTIME
// ==========================================
async function trySeedDatabase() {
  if (!isSupabaseConnected || !supabase) return;

  try {
    // Check master_guru
    const { data: teachers, error: tErr } = await supabase.from('master_guru').select('id').limit(1);
    if (!tErr && (!teachers || teachers.length === 0)) {
      console.log('STAS Supabase Seed: master_guru is empty. Seeding initial teachers...');
      await supabase.from('master_guru').insert(INITIAL_TEACHERS);
    }

    // Check kalender_pendidikan
    const { data: cal, error: cErr } = await supabase.from('kalender_pendidikan').select('id').limit(1);
    if (!cErr && (!cal || cal.length === 0)) {
      console.log('STAS Supabase Seed: kalender_pendidikan is empty. Seeding initial educational calendar...');
      await supabase.from('kalender_pendidikan').insert(INITIAL_CALENDAR);
    }
  } catch (err) {
    console.warn('STAS Supabase Seed: Auto-seeding encounter error (likely missing table setup yet). This is normal.', err);
  }
}

// Fire async seed attempts
setTimeout(trySeedDatabase, 1500);

// ==========================================
// CORE RE-EXPORTABLE DB FETCH INTERFACES
// ==========================================

export async function dbGetCalendar(): Promise<CalendarEvent[]> {
  if (isSupabaseConnected && supabase) {
    try {
      const { data, error } = await supabase.from('kalender_pendidikan').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          bulan: item.bulan,
          tanggal: item.tanggal,
          tanggal_full: item.tanggal_full,
          kegiatan: item.kegiatan,
          kegiatan_lower: item.kegiatan_lower
        })) as CalendarEvent[];
      }
    } catch (e) {
      console.warn('STAS Supabase Engine: Error reading calendar, using fallback.', e);
    }
  }
  return memoryCalendar;
}

export async function dbAddAttendance(record: AttendanceRecord): Promise<void> {
  memoryAttendance.push(record);
  if (isSupabaseConnected && supabase) {
    try {
      const dbRecord = {
        id: record.id,
        teacherId: record.teacherId,
        teacherName: record.teacherName,
        role: record.role,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        distance: record.distance,
        attendanceMode: record.attendanceMode,
        checkType: record.checkType,
        status: record.status,
        deviceInfo: record.deviceInfo,
        createdAt: record.createdAt
      };
      const { error } = await supabase.from('attendance').insert([dbRecord]);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Fail writing attendance record:', e);
    }
  }
}

export async function dbGetAttendance(): Promise<AttendanceRecord[]> {
  if (isSupabaseConnected && supabase) {
    try {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) throw error;
      if (data && data.length > 0) return data as AttendanceRecord[];
    } catch (e) {
      console.warn('STAS Supabase Engine: Error reading attendance, using fallback.', e);
    }
  }
  return memoryAttendance;
}

export async function dbAddCorrection(correction: AttendanceCorrection): Promise<void> {
  memoryCorrections.push(correction);
  if (isSupabaseConnected && supabase) {
    try {
      const dbRecord = {
        id: correction.id,
        teacherId: correction.teacherId,
        teacherName: correction.teacherName,
        correctionDate: correction.correctionDate,
        type: correction.type,
        reason: correction.reason,
        status: correction.status,
        createdAt: correction.createdAt,
        approvedBy: correction.approvedBy || null
      };
      const { error } = await supabase.from('attendance_corrections').insert([dbRecord]);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Fail writing correction:', e);
    }
  }
}

export async function dbGetCorrections(): Promise<AttendanceCorrection[]> {
  if (isSupabaseConnected && supabase) {
    try {
      const { data, error } = await supabase.from('attendance_corrections').select('*');
      if (error) throw error;
      if (data && data.length > 0) return data as AttendanceCorrection[];
    } catch (e) {
      console.warn('STAS Supabase Engine: Error reading corrections, using fallback.', e);
    }
  }
  return memoryCorrections;
}

export async function dbUpdateCorrection(id: string, fields: Partial<AttendanceCorrection>): Promise<void> {
  memoryCorrections = memoryCorrections.map(c => c.id === id ? { ...c, ...fields } as AttendanceCorrection : c);
  if (isSupabaseConnected && supabase) {
    try {
      const dbFields: any = {};
      const validCols = ['teacherId', 'teacherName', 'correctionDate', 'type', 'reason', 'status', 'createdAt', 'approvedBy'];
      validCols.forEach(col => {
        if (fields[col as keyof AttendanceCorrection] !== undefined) {
          dbFields[col] = fields[col as keyof AttendanceCorrection];
        }
      });
      const { error } = await supabase.from('attendance_corrections').update(dbFields).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Error updating correction:', e);
    }
  }
}

export async function dbAddAuditLog(log: AuditLog): Promise<void> {
  const mappedLog = {
    user_id: log.userId,
    action: log.action,
    description: log.description,
    created_at: log.timestamp || new Date().toISOString()
  };
  memoryAudits.push({ ...log, id: Math.floor(Math.random() * 1000000) });
  if (isSupabaseConnected && supabase) {
    try {
      const { error } = await supabase.from('audit_logs').insert([mappedLog]);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Error logging audit:', e);
    }
  }
}

export async function dbGetAuditLogs(): Promise<AuditLog[]> {
  if (isSupabaseConnected && supabase) {
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          id: item.id || idx,
          userId: item.user_id,
          action: item.action,
          description: item.description,
          timestamp: item.created_at,
          ipAddress: ''
        })) as AuditLog[];
      }
    } catch (e) {
      console.warn('STAS Supabase Engine: Error reading audit logs, using fallback.', e);
    }
  }
  return memoryAudits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ==========================================
// STAS GURU (TEACHER) PERSISTENCE ENGINES
// ==========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function updateMemoryTeachers(list: Teacher[]): void {
  memoryTeachers = [...list];
}

export async function dbGetTeachers(): Promise<Teacher[]> {
  if (isSupabaseConnected && supabase) {
    try {
      const { data, error } = await supabase.from('master_guru').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          passwordHash: item.passwordHash,
          role: item.role,
          commission: item.commission,
          qrValue: item.qrValue,
          isActive: item.isActive,
          mustChangePassword: item.mustChangePassword,
          createdAt: item.createdAt,
          currentQrToken: item.currentQrToken,
          qrIssuedAt: item.qrIssuedAt,
          qrExpiredAt: item.qrExpiredAt
        })) as Teacher[];
      }
    } catch (e) {
      console.error('STAS Supabase Engine: Error reading teachers from Postgres. Fallback to memory.', e);
    }
  }
  return memoryTeachers;
}

export async function dbCreateTeacher(teacher: Teacher): Promise<void> {
  if (!memoryTeachers.some(t => t.id === teacher.id)) {
    memoryTeachers.push(teacher);
  }
  if (isSupabaseConnected && supabase) {
    try {
      const dbRecord = {
        id: teacher.id,
        name: teacher.name,
        passwordHash: teacher.passwordHash,
        role: teacher.role,
        commission: teacher.commission,
        qrValue: teacher.qrValue,
        isActive: teacher.isActive,
        mustChangePassword: teacher.mustChangePassword,
        createdAt: teacher.createdAt || new Date().toISOString(),
        currentQrToken: teacher.currentQrToken || null,
        qrIssuedAt: teacher.qrIssuedAt || null,
        qrExpiredAt: teacher.qrExpiredAt || null
      };
      const { error } = await supabase.from('master_guru').insert([dbRecord]);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Error writing teacher to database:', e);
    }
  }
}

export async function dbUpdateTeacher(id: string, fields: Partial<Teacher>): Promise<void> {
  memoryTeachers = memoryTeachers.map(t => t.id === id ? { ...t, ...fields } as Teacher : t);
  if (isSupabaseConnected && supabase) {
    try {
      const dbFields: any = {};
      const validCols = [
        'name', 'passwordHash', 'role', 'commission', 'qrValue', 
        'isActive', 'mustChangePassword', 'createdAt', 
        'currentQrToken', 'qrIssuedAt', 'qrExpiredAt'
      ];
      validCols.forEach(col => {
        if (fields[col as keyof Teacher] !== undefined) {
          let val = fields[col as keyof Teacher];
          // PostgreSQL strict timestamp matching: empty strings are not allowed
          if ((col === 'qrIssuedAt' || col === 'qrExpiredAt') && val === '') {
            val = null as any;
          }
          dbFields[col] = val;
        }
      });
      const { error } = await supabase.from('master_guru').update(dbFields).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Error updating teacher in Postgres:', e);
    }
  }
}

export async function dbDeleteTeacher(id: string): Promise<void> {
  const existingTeacher = memoryTeachers.find(t => t.id === id);
  let emailToDelete: string | null = null;
  if (existingTeacher) {
    const comm = existingTeacher.commission || '';
    const emailMatch = comm.match(/Email:\s*([^\s|]+)/i);
    if (emailMatch && emailMatch[1]) {
      emailToDelete = emailMatch[1].trim().toLowerCase();
    }
  }

  memoryTeachers = memoryTeachers.filter(t => t.id !== id);
  if (isSupabaseConnected && supabase) {
    try {
      // 1. Delete from master_guru postgres table
      const { error } = await supabase.from('master_guru').delete().eq('id', id);
      if (error) throw error;

      // 2. Also delete from Supabase Auth so there are no duplicate email or ID blockages left behind
      const targetIdLower = id.toLowerCase().trim();
      const { data: authData, error: listError } = await supabase.auth.admin.listUsers({
        perPage: 1000
      });
      if (!listError && authData?.users) {
        const authUser = authData.users.find((u: any) => {
          const uEmail = String(u.email || '').toLowerCase().trim();
          const uMetaId = String(u.user_metadata?.id || '').toLowerCase().trim();
          return (emailToDelete && uEmail === emailToDelete) || uMetaId === targetIdLower;
        });

        if (authUser) {
          console.log(`STAS Supabase Engine: Deleting corresponding Auth user UID=${authUser.id} (Email=${authUser.email})`);
          await supabase.auth.admin.deleteUser(authUser.id);
        }
      }
    } catch (e) {
      console.error('STAS Supabase Engine: Error deleting teacher from Postgres/Auth:', e);
    }
  }
}

export async function dbResetTeacherPassword(id: string): Promise<string> {
  const defaultHash = bcrypt.hashSync(id.toLowerCase().trim(), 10);
  const fields = { passwordHash: defaultHash, mustChangePassword: true };

  memoryTeachers = memoryTeachers.map(t => t.id === id ? { ...t, ...fields } as Teacher : t);
  if (isSupabaseConnected && supabase) {
    try {
      const { error } = await supabase.from('master_guru').update(fields).eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('STAS Supabase Engine: Error resetting password in Postgres:', e);
    }
  }
  return id;
}

export { isSupabaseConnected, supabase };
export const clientSupabaseConfig = {
  provider: 'Supabase',
  endpoint: SUPABASE_URL
};
