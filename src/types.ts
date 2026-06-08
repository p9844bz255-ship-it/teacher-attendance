export interface Teacher {
  id: string; // ID Guru (e.g. EMP001)
  name: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'GURU' | 'KEPALA_SEKOLAH';
  commission: string; // Komisi (e.g. Komisi I, Komisi II, etc.)
  qrValue: string; // EMP001|SHA256_HASH
  isActive: boolean;
  mustChangePassword?: boolean;
  _docId?: string; // Optional Firestore document ID
  currentQrToken?: string;
  qrIssuedAt?: string;
  qrExpiredAt?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  role: string;
  timestamp: string; // ISO String
  latitude: number;
  longitude: number;
  distance: number; // in meters
  attendanceMode: 'GPS Only' | 'QR Only' | 'GPS + QR';
  checkType: 'CHECK_IN' | 'CHECK_OUT';
  status: 'HADIR' | 'TERLAMBAT' | 'PULANG_CEPAT';
  deviceInfo: string;
  createdAt: string; // ISO String
}

export interface AttendanceCorrection {
  id: string;
  teacherId: string;
  teacherName: string;
  correctionDate: string; // YYYY-MM-DD
  type: 'LUPA_CHECKIN' | 'LUPA_CHECKOUT' | 'GPS_ERROR' | 'QR_ERROR';
  reason: string;
  attachment?: string; // base64 or URL
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string; // ISO String
}

export interface CalendarEvent {
  bulan: string;
  kegiatan: string;
  kegiatan_lower: string;
  tanggal: string;
  tanggal_full: string;
}

export interface AuditLog {
  id?: string | number;
  userId: string;
  action: string;
  description: string;
  timestamp: string; // ISO String
  ipAddress: string;
}

export interface SystemSettings {
  attendanceMode: 'GPS Only' | 'QR Only' | 'GPS + QR';
  geofenceRadius: number; // Default 50
  schoolLatitude: number; // Default -6.3135
  schoolLongitude: number; // Default 106.6947
}
