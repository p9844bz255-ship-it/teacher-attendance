import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { CalendarEvent, AttendanceRecord, AttendanceCorrection, AuditLog, Teacher } from '../src/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

let app;
let db: any = null;
let auth: any = null;
let isRealFirebaseConnected = false;

// Check if credentials exist and are not placeholder
const hasValidConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'MY_FIREBASE_API_KEY' &&
  firebaseConfig.projectId;

if (hasValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isRealFirebaseConnected = true;
    console.log('STAS Firebase Engine: Connected successfully to real Firestore Database.');
  } catch (error) {
    console.error('STAS Firebase Engine: Failed to connect to Firebase. Falling back to robust in-memory database.', error);
  }
} else {
  console.log('STAS Firebase Engine: Missing NEXT_PUBLIC_FIREBASE_API_KEY. Launching in robust Full-Stack Local Persistence Mode.');
}

// ==========================================
// ROBUST FULL-STACK LOCAL PERSISTENCY ENGINES
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

// Rich set of historical attendance logs to populate dashboard trends and graphs beautifully
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
  },
  {
    id: 'att-5',
    teacherId: 'EMP003',
    teacherName: 'Ust. Ridwan Hakim, M.Pd.',
    role: 'GURU',
    timestamp: '2026-06-05T07:05:10Z',
    latitude: -6.31352,
    longitude: 106.69475,
    distance: 2.5,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_IN',
    status: 'HADIR',
    deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: '2026-06-05T07:05:10Z'
  },
  {
    id: 'att-6',
    teacherId: 'EMP003',
    teacherName: 'Ust. Ridwan Hakim, M.Pd.',
    role: 'GURU',
    timestamp: '2026-06-05T15:45:12Z',
    latitude: -6.31350,
    longitude: 106.69470,
    distance: 1.8,
    attendanceMode: 'GPS + QR',
    checkType: 'CHECK_OUT',
    status: 'PULANG_CEPAT',
    deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    createdAt: '2026-06-05T15:45:12Z'
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
    userId: 'SYSTEM',
    action: 'INIT',
    description: 'Smart Teacher Attendance System (STAS) Core Bootstrapped.',
    timestamp: '2026-06-06T03:30:00Z',
    ipAddress: '127.0.0.1'
  }
];

// Fallback in-memory database instances
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
  },
  {
    id: 'KEP001',
    name: 'H. Abdul Hakim, Lc., M.A.',
    passwordHash: bcrypt.hashSync('KEP001', 10),
    role: 'KEPALA_SEKOLAH',
    commission: 'Kepala Sekolah',
    qrValue: 'KEP001|KEPALA_SEKOLAH_QR_SECRET',
    isActive: true,
    mustChangePassword: true
  },
  {
    id: 'EMP001',
    name: 'Ust. Ahmad Fauzi, S.Pd.I',
    passwordHash: bcrypt.hashSync('EMP001', 10),
    role: 'GURU',
    commission: 'Komisi I (Al Qur\'an & Hadits)',
    qrValue: 'EMP001|7f4c28b4d8d17b8f36118d3d661413159ad9e1bb9356ce0839e1ffba4be4ecbc',
    isActive: true,
    mustChangePassword: true
  },
  {
    id: 'EMP002',
    name: 'Ustd. Sarah Amelia, S.S.',
    passwordHash: bcrypt.hashSync('EMP002', 10),
    role: 'GURU',
    commission: 'Komisi II (Bahasa Arab & Inggris)',
    qrValue: 'EMP002|5d3a21b876a3e6f7902d1f1bc2dca0ef17b8f36159ad9e1bb9356ce0839e1ffba',
    isActive: true,
    mustChangePassword: true
  },
  {
    id: 'EMP003',
    name: 'Ust. Ridwan Hakim, M.Pd.',
    passwordHash: bcrypt.hashSync('EMP003', 10),
    role: 'GURU',
    commission: 'Komisi III (Sains & IPTEK)',
    qrValue: 'EMP003|3f1b49e27c1a8d56b02a6c2bc4a0dfef17b8f36159ad9e1bb9356ce0839e1ffba',
    isActive: true,
    mustChangePassword: true
  }
];

let memoryCalendar: CalendarEvent[] = [...INITIAL_CALENDAR];
let memoryAttendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
let memoryCorrections: AttendanceCorrection[] = [...INITIAL_CORRECTIONS];
let memoryAudits: AuditLog[] = [...INITIAL_AUDITS];
let memoryTeachers: Teacher[] = [...INITIAL_TEACHERS];

// DB Fetch interfaces supporting transparent fallback
export async function dbGetCalendar(): Promise<CalendarEvent[]> {
  if (isRealFirebaseConnected) {
    try {
      const q = collection(db, 'kalender_pendidikan');
      const snap = await getDocs(q);
      const list: CalendarEvent[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as CalendarEvent);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Real Firestore error reading calendar, using fallback.', e);
    }
  }
  return memoryCalendar;
}

export async function dbAddAttendance(record: AttendanceRecord): Promise<void> {
  memoryAttendance.push(record);
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'attendance', record.id), record);
    } catch (e) {
      console.error('Real Firestore writing error:', e);
    }
  }
}

export async function dbGetAttendance(): Promise<AttendanceRecord[]> {
  if (isRealFirebaseConnected) {
    try {
      const q = collection(db, 'attendance');
      const snap = await getDocs(q);
      const list: AttendanceRecord[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as AttendanceRecord);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Real Firestore error reading attendance, using fallback.', e);
    }
  }
  return memoryAttendance;
}

export async function dbAddCorrection(correction: AttendanceCorrection): Promise<void> {
  memoryCorrections.push(correction);
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'attendance_corrections', correction.id), correction);
    } catch (e) {
      console.error('Real Firestore writing correction:', e);
    }
  }
}

export async function dbGetCorrections(): Promise<AttendanceCorrection[]> {
  if (isRealFirebaseConnected) {
    try {
      const q = collection(db, 'attendance_corrections');
      const snap = await getDocs(q);
      const list: AttendanceCorrection[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as AttendanceCorrection);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Real Firestore error reading corrections, using fallback.', e);
    }
  }
  return memoryCorrections;
}

export async function dbUpdateCorrection(id: string, fields: Partial<AttendanceCorrection>): Promise<void> {
  memoryCorrections = memoryCorrections.map(c => c.id === id ? { ...c, ...fields } as AttendanceCorrection : c);
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'attendance_corrections', id), fields, { merge: true });
    } catch (e) {
      console.error('Real Firestore updating correction error:', e);
    }
  }
}

export async function dbAddAuditLog(log: AuditLog): Promise<void> {
  memoryAudits.push(log);
  if (isRealFirebaseConnected) {
    try {
      await addDoc(collection(db, 'audit_logs'), log);
    } catch (e) {
      console.error('Real Firestore logging audit error:', e);
    }
  }
}

export async function dbGetAuditLogs(): Promise<AuditLog[]> {
  if (isRealFirebaseConnected) {
    try {
      const q = collection(db, 'audit_logs');
      const snap = await getDocs(q);
      const list: AuditLog[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as AuditLog);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Real Firestore error reading audit logs, using fallback.', e);
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
  if (isRealFirebaseConnected) {
    const path = 'teachers';
    try {
      const q = collection(db, path);
      const snap = await getDocs(q);
      const list: Teacher[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Teacher);
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.error('STAS Firebase Engine: Error reading teachers from Firestore. Fallback to memory.', e);
    }
  }
  return memoryTeachers;
}

export async function dbCreateTeacher(teacher: Teacher): Promise<void> {
  // Update local memory fallback
  if (!memoryTeachers.some(t => t.id === teacher.id)) {
    memoryTeachers.push(teacher);
  }
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'teachers', teacher.id), teacher);
      console.log("SAVED TO FIRESTORE:", teacher.id);
    } catch (e) {
      console.error('STAS Firebase Engine: Error writing teacher to Firestore:', e);
    }
  }
}

export async function dbUpdateTeacher(id: string, fields: Partial<Teacher>): Promise<void> {
  // Update local memory fallback
  memoryTeachers = memoryTeachers.map(t => t.id === id ? { ...t, ...fields } as Teacher : t);
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'teachers', id), fields, { merge: true });
      console.log("UPDATED IN FIRESTORE:", id);
    } catch (e) {
      console.error('STAS Firebase Engine: Error updating teacher in Firestore:', e);
    }
  }
}

export async function dbDeleteTeacher(id: string): Promise<void> {
  // Update local memory fallback
  memoryTeachers = memoryTeachers.filter(t => t.id !== id);
  if (isRealFirebaseConnected) {
    try {
      await deleteDoc(doc(db, 'teachers', id));
      console.log("DELETED FROM FIRESTORE:", id);
    } catch (e) {
      console.error('STAS Firebase Engine: Error deleting teacher from Firestore:', e);
    }
  }
}

export async function dbResetTeacherPassword(id: string): Promise<string> {
  const defaultHash = bcrypt.hashSync(id.toLowerCase().trim(), 10);
  const fields = { passwordHash: defaultHash, mustChangePassword: true };

  // Update local memory fallback
  memoryTeachers = memoryTeachers.map(t => t.id === id ? { ...t, ...fields } as Teacher : t);
  if (isRealFirebaseConnected) {
    try {
      await setDoc(doc(db, 'teachers', id), fields, { merge: true });
      console.log("PASSWORD RESET IN FIRESTORE:", id);
    } catch (e) {
      console.error('STAS Firebase Engine: Error resetting password in Firestore:', e);
    }
  }
  return id;
}

export { isRealFirebaseConnected };
export const clientFirebaseConfig = firebaseConfig;
