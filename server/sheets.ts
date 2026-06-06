import { Teacher, AttendanceRecord } from '../src/types';
import bcrypt from 'bcryptjs';
import { dbGetTeachers, dbCreateTeacher, isRealFirebaseConnected } from './firebase';

const SPREADSHEET_ID = '1QoSyFJDpXt9Hw4miiN3lEtuzCH3Y2NmpPt43gsGW6e0';

// Default static master teachers list to guarantee pristine operations out-of-the-box
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

// Persistent on-server backup cache of system teachers
let cachedTeachers: Teacher[] = [...INITIAL_TEACHERS];

/**
 * Simple robust CSV Parser
 */
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentValue.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        lines.push(row);
      }
      row = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  if (currentValue || row.length > 0) {
    row.push(currentValue.trim());
    lines.push(row);
  }
  return lines;
}

/**
 * Sync / Read Master Guru from Sheet1
 * Sheet1:
 * Col A: Nama, Col B: ID, Col C: Password, Col D: Komisi / Role, Col E: QR
 */
export async function syncTeacherListFromSheets(): Promise<Teacher[]> {
  try {
    let rawRows: string[][] = [];
    let sourceSuccess = false;

    // 1. Try Google Sheets JSON API if GOOGLE_API_KEY is available
    if (process.env.GOOGLE_API_KEY) {
      try {
        const url = `https://sheets.googleapis.com/v1/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A2:E200?key=${process.env.GOOGLE_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.values && data.values.length > 0) {
            rawRows = data.values;
            sourceSuccess = true;
          }
        }
      } catch (err) {
        console.warn('STAS: Google Sheets API fetch failed, trying CSV export format fallback.', err);
      }
    }

    // 2. Try CSV export format as fallback or if GOOGLE_API_KEY is not defined
    if (!sourceSuccess) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&sheet=Sheet1`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const parsed = parseCSV(text);
          if (parsed.length > 1) {
            // Slice off header [Nama, ID, Password, Komisi, QR]
            rawRows = parsed.slice(1);
            sourceSuccess = true;
          }
        }
      } catch (err) {
        console.warn('STAS: Google Sheets CSV export fetch failed.', err);
      }
    }

    // 3. Process records if successfully loaded from either source
    if (sourceSuccess && rawRows.length > 0) {
      const fetchedTeachers: Teacher[] = rawRows
        .filter(row => {
          const rawId = row[1];
          return rawId !== undefined && rawId !== null && String(rawId).trim() !== '';
        })
        .map((row) => {
          const name = row[0] ? String(row[0]).trim() : 'Unknown';
          const id = String(row[1]).trim();
          const rawPw = row[2] ? String(row[2]).trim() : '';
          const rawRoleOrCommission = row[3] ? String(row[3]).trim() : 'GURU';
          const qrVal = row[4] ? String(row[4]).trim() : `${id}|AUTOGENERATED_SHA_HASH`;

          // Clean password formatting: bcrypt vs plaintext check
          let passwordHash = '';
          const cleanPw = rawPw || id; // Default to ID if empty
          if (cleanPw.startsWith('$2a$') || cleanPw.startsWith('$2b$') || cleanPw.startsWith('$2y$')) {
            passwordHash = cleanPw;
          } else {
            passwordHash = bcrypt.hashSync(cleanPw, 10);
          }

          // Role determination and deduction
          let role: Teacher['role'] = 'GURU';
          const upperRoleOrCommission = rawRoleOrCommission.toUpperCase();
          const upperId = id.toUpperCase();

          if (upperRoleOrCommission.includes('SUPER_ADMIN') || upperRoleOrCommission.includes('SUPER ADMIN') || upperId.includes('SUPER')) {
            role = 'SUPER_ADMIN';
          } else if (upperRoleOrCommission.includes('ADMIN') || upperId.includes('ADM')) {
            role = 'ADMIN';
          } else if (upperRoleOrCommission.includes('KEPALA_SEKOLAH') || upperRoleOrCommission.includes('KEPALA SEKOLAH') || upperRoleOrCommission.includes('KEP') || upperId.includes('KEP')) {
            role = 'KEPALA_SEKOLAH';
          }

          return {
            id,
            name,
            passwordHash,
            role,
            commission: rawRoleOrCommission,
            qrValue: qrVal,
            isActive: true,
            mustChangePassword: !rawPw || rawPw === id // Force password change if default/empty
          };
        });

      if (fetchedTeachers.length > 0) {
        cachedTeachers = fetchedTeachers;
        console.log(`Teachers loaded from Google Sheets: ${fetchedTeachers.length}`);
        return cachedTeachers;
      }
    }
  } catch (error) {
    console.error('STAS Sheets Sync Error:', error);
  }

  // If both options failed or returned empty dataset, fall back to initial schema list
  cachedTeachers = [...INITIAL_TEACHERS];
  console.log('Fallback to INITIAL_TEACHERS');
  return cachedTeachers;
}

/**
 * Append Live Attendance to Sheet2
 * Sheet2 columns:
 * A: Timestamp, B: Nama, C: ID, D: Komisi, E: Latitude, F: Longitude, G: Distance, H: Status, I: Device, J: Check Type, K: Attendance Mode
 */
export async function appendAttendanceToSheets(record: AttendanceRecord): Promise<boolean> {
  const payload = [
    record.timestamp,
    record.teacherName,
    record.teacherId,
    record.role === 'GURU' ? record.role : `${record.role} (${record.role})`, // Matches report layouts
    record.latitude,
    record.longitude,
    record.distance.toFixed(1),
    record.status,
    record.deviceInfo,
    record.checkType,
    record.attendanceMode
  ];

  console.log(`STAS Sheet Sync Engine: Logging check event to stdout:`, payload);

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || process.env.GOOGLE_OAUTH_TOKEN) {
      // In production platforms where user has provisioned oauth token or service accounts
      const token = process.env.GOOGLE_OAUTH_TOKEN;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet2!A:K:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          values: [payload]
        })
      });
      if (response.ok) {
        console.log(`STAS Sheets Sync: Successfully synced record for ID ${record.teacherId} to Sheet2.`);
        return true;
      } else {
        console.warn(`STAS Sheets Sync Warning: Sheet2 append server returned status ${response.status}`);
      }
    }
  } catch (error) {
    console.error(`STAS Sheets Sync Error: Failed to sync record for ID ${record.teacherId} to Google Sheet. Storing in Firestore instead.`, error);
  }
  return false;
}

// Return live teacher registry from memory
export function getCachedTeachers(): Teacher[] {
  return cachedTeachers;
}

// Support Super Admin CRUD
export function updateCachedTeachers(updatedList: Teacher[]) {
  cachedTeachers = updatedList;
}
export function addTeacherToCache(teacher: Teacher) {
  if (!cachedTeachers.some(t => t.id === teacher.id)) {
    cachedTeachers.push(teacher);
  }
}
export function removeTeacherFromCache(id: string) {
  cachedTeachers = cachedTeachers.filter(t => t.id !== id);
}
export function updateTeacherInCache(id: string, fields: Partial<Teacher>) {
  cachedTeachers = cachedTeachers.map(t => t.id === id ? { ...t, ...fields } : t);
}
export function resetTeacherPasswordInCache(id: string): string {
  // Reset password to default ID Guru as instructed: ID Guru = Password Awal (forces shift password)
  const defaultHash = bcrypt.hashSync(id, 10);
  cachedTeachers = cachedTeachers.map(t => t.id === id ? { ...t, passwordHash: defaultHash, mustChangePassword: true } : t);
  return id;
}

export async function syncTeacherListFromFirestore(): Promise<Teacher[]> {
  try {
    console.log('STAS Sync: Initiating Google Sheets & Firestore hybrid synchronization...');
    
    // 1. Fetch Master Data from Google Sheets
    const sheetsTeachers = await syncTeacherListFromSheets();
    
    // 2. Fetch persistent state from Firestore
    const fsTeachers = await dbGetTeachers();
    
    // 3. Merge both sources
    const mergedMap = new Map<string, Teacher>();
    
    // First, populate with Google Sheets master teachers
    if (sheetsTeachers && sheetsTeachers.length > 0) {
      for (const t of sheetsTeachers) {
        mergedMap.set(t.id.toLowerCase().trim(), t);
      }
    }
    
    // Second, merge on top with Firestore records (overwriting matching IDs or keeping CRUD teachers)
    if (fsTeachers && fsTeachers.length > 0) {
      for (const ft of fsTeachers) {
        const key = ft.id.toLowerCase().trim();
        const existing = mergedMap.get(key);
        if (existing) {
          // Exist in both! Merge them: use sheets basic data but overlay system updates from Firestore
          mergedMap.set(key, {
            ...existing,
            ...ft
          });
        } else {
          // Exists only in Firestore (CRUD added teachers)
          mergedMap.set(key, ft);
        }
      }
    }
    
    const finalTeachers = Array.from(mergedMap.values());
    
    // 4. Update the active memory cache
    if (finalTeachers.length > 0) {
      cachedTeachers = finalTeachers;
      console.log(`STAS Sync: Successfully merged sources. Active teacher registry contains ${cachedTeachers.length} entries.`);
      
      // 5. Seed newly discovered Google Sheets teachers to Firestore so everything stays persistently in sync
      if (isRealFirebaseConnected) {
        try {
          const fsTeacherIds = new Set((fsTeachers || []).map(t => t.id.toLowerCase().trim()));
          let newlySeededCount = 0;
          for (const t of finalTeachers) {
            const cleanId = t.id.toLowerCase().trim();
            if (!fsTeacherIds.has(cleanId)) {
              // This is a new teacher from sheets not yet in Firestore! Persist it.
              await dbCreateTeacher(t);
              newlySeededCount++;
            }
          }
          if (newlySeededCount > 0) {
            console.log(`STAS Sync: Seeded ${newlySeededCount} newly discovered Google Sheets teachers to Firestore.`);
          }
        } catch (seedErr) {
          console.error('STAS Sync: Seeding newly discovered teachers failed:', seedErr);
        }
      }
    }
    
    return cachedTeachers;
  } catch (error) {
    console.error('STAS Sync: syncTeacherListFromFirestore completely failed, falling back to cachedTeachers:', error);
    return cachedTeachers;
  }
}
