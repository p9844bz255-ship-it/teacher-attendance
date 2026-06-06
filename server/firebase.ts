import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { CalendarEvent, AttendanceRecord, AttendanceCorrection, AuditLog } from '../src/types';

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
let memoryCalendar: CalendarEvent[] = [...INITIAL_CALENDAR];
let memoryAttendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
let memoryCorrections: AttendanceCorrection[] = [...INITIAL_CORRECTIONS];
let memoryAudits: AuditLog[] = [...INITIAL_AUDITS];

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

export { isRealFirebaseConnected };
export const clientFirebaseConfig = firebaseConfig;
