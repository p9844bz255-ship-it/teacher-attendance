var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  generateQRValue: () => generateQRValue
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
var import_vite = require("vite");

// server/sheets.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);

// server/firebase.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_auth = require("firebase/auth");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};
var app;
var db = null;
var auth = null;
var isRealFirebaseConnected = false;
var hasValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== "MY_FIREBASE_API_KEY" && firebaseConfig.projectId;
if (hasValidConfig) {
  try {
    app = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(firebaseConfig) : (0, import_app.getApp)();
    db = (0, import_firestore.getFirestore)(app);
    auth = (0, import_auth.getAuth)(app);
    isRealFirebaseConnected = true;
    console.log("STAS Firebase Engine: Connected successfully to real Firestore Database.");
  } catch (error) {
    console.error("STAS Firebase Engine: Failed to connect to Firebase. Falling back to robust in-memory database.", error);
  }
} else {
  console.log("STAS Firebase Engine: Missing NEXT_PUBLIC_FIREBASE_API_KEY. Launching in robust Full-Stack Local Persistence Mode.");
}
var INITIAL_CALENDAR = [
  {
    bulan: "Juni",
    tanggal: "10",
    tanggal_full: "10 Juni 2026",
    kegiatan: "Rapat Kerja Umum Guru & WFH",
    kegiatan_lower: "rapat kerja umum guru & wfh"
  },
  {
    bulan: "Juni",
    tanggal: "15 - 18",
    tanggal_full: "15 - 18 Juni 2026",
    kegiatan: "Libur Hari Raya Idul Adha 1447H",
    kegiatan_lower: "libur hari raya idul adha 1447h"
  },
  {
    bulan: "Juni",
    tanggal: "20 - 30",
    tanggal_full: "20 - 30 Juni 2026",
    kegiatan: "Libur Akhir Semester Genap",
    kegiatan_lower: "libur akhir semester genap"
  },
  {
    bulan: "Juli",
    tanggal: "1 - 3",
    tanggal_full: "1 - 3 Juli 2026",
    kegiatan: "Libur Semester 2",
    kegiatan_lower: "libur semester 2"
  }
];
var INITIAL_ATTENDANCE = [
  {
    id: "att-1",
    teacherId: "EMP001",
    teacherName: "Ust. Ahmad Fauzi, S.Pd.I",
    role: "GURU",
    timestamp: "2026-06-05T07:02:11Z",
    latitude: -6.31345,
    longitude: 106.69468,
    distance: 4.2,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_IN",
    status: "HADIR",
    deviceInfo: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)",
    createdAt: "2026-06-05T07:02:11Z"
  },
  {
    id: "att-2",
    teacherId: "EMP001",
    teacherName: "Ust. Ahmad Fauzi, S.Pd.I",
    role: "GURU",
    timestamp: "2026-06-05T16:05:00Z",
    latitude: -6.31348,
    longitude: 106.69472,
    distance: 3.1,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_OUT",
    status: "HADIR",
    deviceInfo: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)",
    createdAt: "2026-06-05T16:05:00Z"
  },
  {
    id: "att-3",
    teacherId: "EMP002",
    teacherName: "Ustd. Sarah Amelia, S.S.",
    role: "GURU",
    timestamp: "2026-06-05T07:15:32Z",
    latitude: -6.31339,
    longitude: 106.6946,
    distance: 13.5,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_IN",
    status: "TERLAMBAT",
    deviceInfo: "Mozilla/5.0 (Linux; Android 13; SM-S901B)",
    createdAt: "2026-06-05T07:15:32Z"
  },
  {
    id: "att-4",
    teacherId: "EMP002",
    teacherName: "Ustd. Sarah Amelia, S.S.",
    role: "GURU",
    timestamp: "2026-06-05T16:02:15Z",
    latitude: -6.3134,
    longitude: 106.69465,
    distance: 11.2,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_OUT",
    status: "HADIR",
    deviceInfo: "Mozilla/5.0 (Linux; Android 13; SM-S901B)",
    createdAt: "2026-06-05T16:02:15Z"
  },
  {
    id: "att-5",
    teacherId: "EMP003",
    teacherName: "Ust. Ridwan Hakim, M.Pd.",
    role: "GURU",
    timestamp: "2026-06-05T07:05:10Z",
    latitude: -6.31352,
    longitude: 106.69475,
    distance: 2.5,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_IN",
    status: "HADIR",
    deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    createdAt: "2026-06-05T07:05:10Z"
  },
  {
    id: "att-6",
    teacherId: "EMP003",
    teacherName: "Ust. Ridwan Hakim, M.Pd.",
    role: "GURU",
    timestamp: "2026-06-05T15:45:12Z",
    latitude: -6.3135,
    longitude: 106.6947,
    distance: 1.8,
    attendanceMode: "GPS + QR",
    checkType: "CHECK_OUT",
    status: "PULANG_CEPAT",
    deviceInfo: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    createdAt: "2026-06-05T15:45:12Z"
  }
];
var INITIAL_CORRECTIONS = [
  {
    id: "corr-1",
    teacherId: "EMP002",
    teacherName: "Ustd. Sarah Amelia, S.S.",
    correctionDate: "2026-06-04",
    type: "GPS_ERROR",
    reason: "GPS Akurasi rendah di lapangan upacara sehingga memblokir absen biasa.",
    status: "PENDING",
    createdAt: "2026-06-04T10:00:00Z"
  }
];
var INITIAL_AUDITS = [
  {
    userId: "SYSTEM",
    action: "INIT",
    description: "Smart Teacher Attendance System (STAS) Core Bootstrapped.",
    timestamp: "2026-06-06T03:30:00Z",
    ipAddress: "127.0.0.1"
  }
];
var INITIAL_TEACHERS = [
  {
    id: "admin",
    name: "Super Admin STAS",
    passwordHash: import_bcryptjs.default.hashSync("lessonplan", 10),
    role: "SUPER_ADMIN",
    commission: "Management",
    qrValue: "admin|SYSTEM_ADMIN_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: false
  },
  {
    id: "SUPER001",
    name: "Super Admin STAS Legacy",
    passwordHash: import_bcryptjs.default.hashSync("SUPER001", 10),
    role: "SUPER_ADMIN",
    commission: "Direktorat Akademi",
    qrValue: "SUPER001|SYSTEM_ADMIN_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "ADM001",
    name: "Admin Al-Wildan BSD",
    passwordHash: import_bcryptjs.default.hashSync("ADM001", 10),
    role: "ADMIN",
    commission: "Humas & Kesiswaan",
    qrValue: "ADM001|SYSTEM_WRITER_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "KEP001",
    name: "H. Abdul Hakim, Lc., M.A.",
    passwordHash: import_bcryptjs.default.hashSync("KEP001", 10),
    role: "KEPALA_SEKOLAH",
    commission: "Kepala Sekolah",
    qrValue: "KEP001|KEPALA_SEKOLAH_QR_SECRET",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP001",
    name: "Ust. Ahmad Fauzi, S.Pd.I",
    passwordHash: import_bcryptjs.default.hashSync("EMP001", 10),
    role: "GURU",
    commission: "Komisi I (Al Qur'an & Hadits)",
    qrValue: "EMP001|7f4c28b4d8d17b8f36118d3d661413159ad9e1bb9356ce0839e1ffba4be4ecbc",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP002",
    name: "Ustd. Sarah Amelia, S.S.",
    passwordHash: import_bcryptjs.default.hashSync("EMP002", 10),
    role: "GURU",
    commission: "Komisi II (Bahasa Arab & Inggris)",
    qrValue: "EMP002|5d3a21b876a3e6f7902d1f1bc2dca0ef17b8f36159ad9e1bb9356ce0839e1ffba",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP003",
    name: "Ust. Ridwan Hakim, M.Pd.",
    passwordHash: import_bcryptjs.default.hashSync("EMP003", 10),
    role: "GURU",
    commission: "Komisi III (Sains & IPTEK)",
    qrValue: "EMP003|3f1b49e27c1a8d56b02a6c2bc4a0dfef17b8f36159ad9e1bb9356ce0839e1ffba",
    isActive: true,
    mustChangePassword: true
  }
];
var memoryCalendar = [...INITIAL_CALENDAR];
var memoryAttendance = [...INITIAL_ATTENDANCE];
var memoryCorrections = [...INITIAL_CORRECTIONS];
var memoryAudits = [...INITIAL_AUDITS];
var memoryTeachers = [...INITIAL_TEACHERS];
async function dbGetCalendar() {
  if (isRealFirebaseConnected) {
    try {
      const q = (0, import_firestore.collection)(db, "kalender_pendidikan");
      const snap = await (0, import_firestore.getDocs)(q);
      const list = [];
      snap.forEach((doc2) => {
        list.push(doc2.data());
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn("Real Firestore error reading calendar, using fallback.", e);
    }
  }
  return memoryCalendar;
}
async function dbAddAttendance(record) {
  memoryAttendance.push(record);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "attendance", record.id), record);
    } catch (e) {
      console.error("Real Firestore writing error:", e);
    }
  }
}
async function dbGetAttendance() {
  if (isRealFirebaseConnected) {
    try {
      const q = (0, import_firestore.collection)(db, "attendance");
      const snap = await (0, import_firestore.getDocs)(q);
      const list = [];
      snap.forEach((doc2) => {
        list.push(doc2.data());
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn("Real Firestore error reading attendance, using fallback.", e);
    }
  }
  return memoryAttendance;
}
async function dbAddCorrection(correction) {
  memoryCorrections.push(correction);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "attendance_corrections", correction.id), correction);
    } catch (e) {
      console.error("Real Firestore writing correction:", e);
    }
  }
}
async function dbGetCorrections() {
  if (isRealFirebaseConnected) {
    try {
      const q = (0, import_firestore.collection)(db, "attendance_corrections");
      const snap = await (0, import_firestore.getDocs)(q);
      const list = [];
      snap.forEach((doc2) => {
        list.push(doc2.data());
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn("Real Firestore error reading corrections, using fallback.", e);
    }
  }
  return memoryCorrections;
}
async function dbUpdateCorrection(id, fields) {
  memoryCorrections = memoryCorrections.map((c) => c.id === id ? { ...c, ...fields } : c);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "attendance_corrections", id), fields, { merge: true });
    } catch (e) {
      console.error("Real Firestore updating correction error:", e);
    }
  }
}
async function dbAddAuditLog(log) {
  memoryAudits.push(log);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.addDoc)((0, import_firestore.collection)(db, "audit_logs"), log);
    } catch (e) {
      console.error("Real Firestore logging audit error:", e);
    }
  }
}
async function dbGetAuditLogs() {
  if (isRealFirebaseConnected) {
    try {
      const q = (0, import_firestore.collection)(db, "audit_logs");
      const snap = await (0, import_firestore.getDocs)(q);
      const list = [];
      snap.forEach((doc2) => {
        list.push(doc2.data());
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn("Real Firestore error reading audit logs, using fallback.", e);
    }
  }
  return memoryAudits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
function updateMemoryTeachers(list) {
  memoryTeachers = [...list];
}
async function dbGetTeachers() {
  if (isRealFirebaseConnected) {
    const path2 = "master_guru";
    try {
      const q = (0, import_firestore.collection)(db, path2);
      const snap = await (0, import_firestore.getDocs)(q);
      const list = [];
      snap.forEach((doc2) => {
        list.push(doc2.data());
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.error("STAS Firebase Engine: Error reading teachers from Firestore. Fallback to memory.", e);
    }
  }
  return memoryTeachers;
}
async function dbCreateTeacher(teacher) {
  if (!memoryTeachers.some((t) => t.id === teacher.id)) {
    memoryTeachers.push(teacher);
  }
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "master_guru", teacher.id), teacher);
      console.log("SAVED TO FIRESTORE:", teacher.id);
    } catch (e) {
      console.error("STAS Firebase Engine: Error writing teacher to Firestore:", e);
    }
  }
}
async function dbUpdateTeacher(id, fields) {
  memoryTeachers = memoryTeachers.map((t) => t.id === id ? { ...t, ...fields } : t);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "master_guru", id), fields, { merge: true });
      console.log("UPDATED IN FIRESTORE:", id);
    } catch (e) {
      console.error("STAS Firebase Engine: Error updating teacher in Firestore:", e);
    }
  }
}
async function dbDeleteTeacher(id) {
  memoryTeachers = memoryTeachers.filter((t) => t.id !== id);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "master_guru", id));
      console.log("DELETED FROM FIRESTORE:", id);
    } catch (e) {
      console.error("STAS Firebase Engine: Error deleting teacher from Firestore:", e);
    }
  }
}
async function dbResetTeacherPassword(id) {
  const defaultHash = import_bcryptjs.default.hashSync(id.toLowerCase().trim(), 10);
  const fields = { passwordHash: defaultHash, mustChangePassword: true };
  memoryTeachers = memoryTeachers.map((t) => t.id === id ? { ...t, ...fields } : t);
  if (isRealFirebaseConnected) {
    try {
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "master_guru", id), fields, { merge: true });
      console.log("PASSWORD RESET IN FIRESTORE:", id);
    } catch (e) {
      console.error("STAS Firebase Engine: Error resetting password in Firestore:", e);
    }
  }
  return id;
}
var clientFirebaseConfig = firebaseConfig;

// server/sheets.ts
var SPREADSHEET_ID = "1QoSyFJDpXt9Hw4miiN3lEtuzCH3Y2NmpPt43gsGW6e0";
var INITIAL_TEACHERS2 = [
  {
    id: "admin",
    name: "Super Admin STAS",
    passwordHash: import_bcryptjs2.default.hashSync("lessonplan", 10),
    role: "SUPER_ADMIN",
    commission: "Management",
    qrValue: "admin|SYSTEM_ADMIN_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: false
  },
  {
    id: "SUPER001",
    name: "Super Admin STAS Legacy",
    passwordHash: import_bcryptjs2.default.hashSync("SUPER001", 10),
    role: "SUPER_ADMIN",
    commission: "Direktorat Akademi",
    qrValue: "SUPER001|SYSTEM_ADMIN_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "ADM001",
    name: "Admin Al-Wildan BSD",
    passwordHash: import_bcryptjs2.default.hashSync("ADM001", 10),
    role: "ADMIN",
    commission: "Humas & Kesiswaan",
    qrValue: "ADM001|SYSTEM_WRITER_QR_SECRET_MD5",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "KEP001",
    name: "H. Abdul Hakim, Lc., M.A.",
    passwordHash: import_bcryptjs2.default.hashSync("KEP001", 10),
    role: "KEPALA_SEKOLAH",
    commission: "Kepala Sekolah",
    qrValue: "KEP001|KEPALA_SEKOLAH_QR_SECRET",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP001",
    name: "Ust. Ahmad Fauzi, S.Pd.I",
    passwordHash: import_bcryptjs2.default.hashSync("EMP001", 10),
    role: "GURU",
    commission: "Komisi I (Al Qur'an & Hadits)",
    qrValue: "EMP001|7f4c28b4d8d17b8f36118d3d661413159ad9e1bb9356ce0839e1ffba4be4ecbc",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP002",
    name: "Ustd. Sarah Amelia, S.S.",
    passwordHash: import_bcryptjs2.default.hashSync("EMP002", 10),
    role: "GURU",
    commission: "Komisi II (Bahasa Arab & Inggris)",
    qrValue: "EMP002|5d3a21b876a3e6f7902d1f1bc2dca0ef17b8f36159ad9e1bb9356ce0839e1ffba",
    isActive: true,
    mustChangePassword: true
  },
  {
    id: "EMP003",
    name: "Ust. Ridwan Hakim, M.Pd.",
    passwordHash: import_bcryptjs2.default.hashSync("EMP003", 10),
    role: "GURU",
    commission: "Komisi III (Sains & IPTEK)",
    qrValue: "EMP003|3f1b49e27c1a8d56b02a6c2bc4a0dfef17b8f36159ad9e1bb9356ce0839e1ffba",
    isActive: true,
    mustChangePassword: true
  }
];
var cachedTeachers = [...INITIAL_TEACHERS2];
function parseCSV(csvText) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentValue = "";
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      row.push(currentValue.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
        lines.push(row);
      }
      row = [];
      currentValue = "";
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
async function syncTeacherListFromSheets() {
  try {
    let rawRows = [];
    let sourceSuccess = false;
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
        console.warn("STAS: Google Sheets API fetch failed, trying CSV export format fallback.", err);
      }
    }
    if (!sourceSuccess) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&sheet=Sheet1`;
        const res = await fetch(csvUrl);
        if (res.ok) {
          const text = await res.text();
          const parsed = parseCSV(text);
          if (parsed.length > 1) {
            rawRows = parsed.slice(1);
            sourceSuccess = true;
          }
        }
      } catch (err) {
        console.warn("STAS: Google Sheets CSV export fetch failed.", err);
      }
    }
    if (sourceSuccess && rawRows.length > 0) {
      const fetchedTeachers = rawRows.filter((row) => {
        const rawId = row[1];
        return rawId !== void 0 && rawId !== null && String(rawId).trim() !== "";
      }).map((row) => {
        const name = row[0] ? String(row[0]).trim() : "Unknown";
        const id = String(row[1]).trim();
        const rawPw = row[2] ? String(row[2]).trim() : "";
        const rawRoleOrCommission = row[3] ? String(row[3]).trim() : "GURU";
        const qrVal = row[4] ? String(row[4]).trim() : `${id}|AUTOGENERATED_SHA_HASH`;
        let passwordHash = "";
        const cleanId = id.toLowerCase().trim();
        let cleanPw = rawPw ? String(rawPw).trim() : cleanId;
        if (cleanPw.toLowerCase() === id.toLowerCase()) {
          cleanPw = cleanId;
        }
        if (cleanPw.startsWith("$2a$") || cleanPw.startsWith("$2b$") || cleanPw.startsWith("$2y$")) {
          passwordHash = cleanPw;
        } else {
          passwordHash = import_bcryptjs2.default.hashSync(cleanPw, 10);
        }
        let role = "GURU";
        const upperRoleOrCommission = rawRoleOrCommission.toUpperCase();
        const upperId = id.toUpperCase();
        if (upperRoleOrCommission.includes("SUPER_ADMIN") || upperRoleOrCommission.includes("SUPER ADMIN") || upperId.includes("SUPER")) {
          role = "SUPER_ADMIN";
        } else if (upperRoleOrCommission.includes("ADMIN") || upperId.includes("ADM")) {
          role = "ADMIN";
        } else if (upperRoleOrCommission.includes("KEPALA_SEKOLAH") || upperRoleOrCommission.includes("KEPALA SEKOLAH") || upperRoleOrCommission.includes("KEP") || upperId.includes("KEP")) {
          role = "KEPALA_SEKOLAH";
        }
        return {
          id,
          name,
          passwordHash,
          role,
          commission: rawRoleOrCommission,
          qrValue: qrVal,
          isActive: true,
          mustChangePassword: !rawPw || rawPw.toLowerCase().trim() === id.toLowerCase().trim()
        };
      });
      if (fetchedTeachers.length > 0) {
        cachedTeachers = fetchedTeachers;
        updateMemoryTeachers(fetchedTeachers);
        console.log(`Teachers loaded from Google Sheets: ${fetchedTeachers.length}`);
        return cachedTeachers;
      }
    }
  } catch (error) {
    console.error("STAS Sheets Sync Error:", error);
  }
  cachedTeachers = [...INITIAL_TEACHERS2];
  updateMemoryTeachers(cachedTeachers);
  console.log("Fallback to INITIAL_TEACHERS");
  return cachedTeachers;
}
async function appendAttendanceToSheets(record) {
  const payload = [
    record.timestamp,
    record.teacherName,
    record.teacherId,
    record.role === "GURU" ? record.role : `${record.role} (${record.role})`,
    // Matches report layouts
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
      const token = process.env.GOOGLE_OAUTH_TOKEN;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet2!A:K:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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
function getCachedTeachers() {
  return cachedTeachers;
}
function addTeacherToCache(teacher) {
  if (!cachedTeachers.some((t) => t.id === teacher.id)) {
    cachedTeachers.push(teacher);
    updateMemoryTeachers(cachedTeachers);
  }
}
function removeTeacherFromCache(id) {
  cachedTeachers = cachedTeachers.filter((t) => t.id !== id);
  updateMemoryTeachers(cachedTeachers);
}
function updateTeacherInCache(id, fields) {
  cachedTeachers = cachedTeachers.map((t) => t.id === id ? { ...t, ...fields } : t);
  updateMemoryTeachers(cachedTeachers);
}
function resetTeacherPasswordInCache(id) {
  const defaultHash = import_bcryptjs2.default.hashSync(id.toLowerCase().trim(), 10);
  cachedTeachers = cachedTeachers.map((t) => t.id === id ? { ...t, passwordHash: defaultHash, mustChangePassword: true } : t);
  updateMemoryTeachers(cachedTeachers);
  return id;
}
async function syncTeacherListFromFirestore() {
  try {
    console.log("STAS Sync: Initiating Google Sheets & Firestore hybrid synchronization...");
    const sheetsTeachers = await syncTeacherListFromSheets();
    const fsTeachers = await dbGetTeachers();
    const mergedMap = /* @__PURE__ */ new Map();
    if (sheetsTeachers && sheetsTeachers.length > 0) {
      for (const t of sheetsTeachers) {
        mergedMap.set(t.id.toLowerCase().trim(), t);
      }
    }
    if (fsTeachers && fsTeachers.length > 0) {
      for (const ft of fsTeachers) {
        const key = ft.id.toLowerCase().trim();
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, {
            ...existing,
            ...ft
          });
        } else {
          mergedMap.set(key, ft);
        }
      }
    }
    const finalTeachers = Array.from(mergedMap.values());
    if (finalTeachers.length > 0) {
      cachedTeachers = finalTeachers;
      updateMemoryTeachers(finalTeachers);
      console.log(`STAS Sync: Successfully merged sources. Active teacher registry contains ${cachedTeachers.length} entries.`);
      if (isRealFirebaseConnected) {
        try {
          const fsTeacherIds = new Set((fsTeachers || []).map((t) => t.id.toLowerCase().trim()));
          let newlySeededCount = 0;
          for (const t of finalTeachers) {
            const cleanId = t.id.toLowerCase().trim();
            if (!fsTeacherIds.has(cleanId)) {
              await dbCreateTeacher(t);
              newlySeededCount++;
            }
          }
          if (newlySeededCount > 0) {
            console.log(`STAS Sync: Seeded ${newlySeededCount} newly discovered Google Sheets teachers to Firestore.`);
          }
        } catch (seedErr) {
          console.error("STAS Sync: Seeding newly discovered teachers failed:", seedErr);
        }
      }
    }
    return cachedTeachers;
  } catch (error) {
    console.error("STAS Sync: syncTeacherListFromFirestore completely failed, falling back to cachedTeachers:", error);
    updateMemoryTeachers(cachedTeachers);
    return cachedTeachers;
  }
}

// server/calendar.ts
var MONTH_MAP = {
  januari: 0,
  january: 0,
  februari: 1,
  february: 1,
  maret: 2,
  march: 2,
  april: 3,
  mei: 4,
  may: 4,
  juni: 5,
  june: 5,
  juli: 6,
  july: 6,
  agustus: 7,
  august: 7,
  september: 8,
  oktober: 9,
  october: 9,
  november: 10,
  desember: 11,
  december: 11
};
function parseCalendarDateRange(tanggal, bulan, year = 2026) {
  const cleanBulan = bulan.toLowerCase().trim();
  const monthIdx = MONTH_MAP[cleanBulan] !== void 0 ? MONTH_MAP[cleanBulan] : -1;
  if (monthIdx === -1) {
    return { startDays: [], endDays: [], month: -1 };
  }
  const rangeMatch = tanggal.replace(/\s+/g, "").match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return {
      startDays: [parseInt(rangeMatch[1], 10)],
      endDays: [parseInt(rangeMatch[2], 10)],
      month: monthIdx
    };
  }
  const singleMatch = tanggal.trim().match(/^(\d+)$/);
  if (singleMatch) {
    const day = parseInt(singleMatch[1], 10);
    return {
      startDays: [day],
      endDays: [day],
      month: monthIdx
    };
  }
  const numbers = tanggal.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    return {
      startDays: [parseInt(numbers[0], 10)],
      endDays: [parseInt(numbers[numbers.length - 1], 10)],
      month: monthIdx
    };
  } else if (numbers && numbers.length === 1) {
    return {
      startDays: [parseInt(numbers[0], 10)],
      endDays: [parseInt(numbers[0], 10)],
      month: monthIdx
    };
  }
  return { startDays: [], endDays: [], month: monthIdx };
}
function evaluateSchoolStatus(events, targetDate = /* @__PURE__ */ new Date()) {
  const currentMonth = targetDate.getMonth();
  const currentDay = targetDate.getDate();
  const currentYear = targetDate.getFullYear();
  for (const event of events) {
    const { startDays, endDays, month } = parseCalendarDateRange(event.tanggal, event.bulan, currentYear);
    if (month === currentMonth && startDays.length > 0) {
      const start = startDays[0];
      const end = endDays[0];
      if (currentDay >= start && currentDay <= end) {
        const desc = event.kegiatan_lower || event.kegiatan.toLowerCase();
        if (desc.includes("libur")) {
          return { status: "LIBUR", activeEvent: event };
        }
        if (desc.includes("wfh")) {
          return { status: "WFH", activeEvent: event };
        }
      }
    }
  }
  return { status: "NORMAL" };
}

// server/gemini.ts
var import_genai = require("@google/genai");
var aiInstance = null;
function getGeminiClient() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiInstance = new import_genai.GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return aiInstance;
}
async function generateExecutiveAIInsight(metrics) {
  const client = getGeminiClient();
  if (!client) {
    const attendancePercentage = metrics.totalTeachers > 0 ? Math.round(metrics.activeHadir / metrics.totalTeachers * 100) : 100;
    return `**STAS AI Insight (Fallback Mode):** Kehadiran hari ini tercatat pada tingkat **${attendancePercentage}%**. Tingkat ketepatan waktu berada di kisaran yang baik dengan **${metrics.terlambatCount}** guru terlambat. Pengajar paling konsisten pekan ini adalah **${metrics.topDiscipline || "Ust. Ahmad Fauzi, S.Pd.I"}**. *(Hubungkan GEMINI_API_KEY Anda di Settings > Secrets untuk mengaktifkan analisis kualitatif real-time)*.`;
  }
  try {
    const prompt = `Lakukan analisis data kehadiran guru Al-Wildan Islamic School 3 BSD City berikut.
    Beri ringkasan eksekutif profesional, tajam, dan singkat (maksimal 3 paragraf pendek) dalam bahasa Indonesia.
    Gunakan gaya bahasa Vercel/Stripe: bersih, humanis, objektif, tanpa kata-kata berbunga-bunga/lebay.
    
    METRIK HARI INI:
    - Total Guru Terdaftar: ${metrics.totalTeachers}
    - Hadir Tepat Waktu: ${metrics.activeHadir}
    - Terlambat: ${metrics.terlambatCount}
    - Pulang Cepat: ${metrics.pulangCepatCount}
    - Mangkir / Tanpa Keterangan (Alpha): ${metrics.alphaCount}
    - Guru Paling Disiplin pekan ini: ${metrics.topDiscipline || "Belum ada catatan"}
    - Tren kehadiran 7 hari terakhir: ${JSON.stringify(metrics.attendanceTrend)}

    Berikan insight tentang kepatuhan disiplin pengajar, pola keterlambatan, serta rekomendasi manajerial sekolah yang bermanfaat untuk meningkatkan kinerja akademik.`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah Enterprise AI School Consultant terkemuka untuk Al-Wildan Islamic School. Tugas Anda memberikan evaluasi kepatuhan mengajar dan ketepatan kehadiran pengajar dalam bentuk analisis eksekutif.",
        temperature: 0.5
      }
    });
    if (response && response.text) {
      return response.text;
    }
    throw new Error("Empty response text from Gemini API");
  } catch (error) {
    console.error("STAS AI Insight Generation error:", error);
    return `**STAS AI Insight (Error State):** Gagal memformulasikan analisis otomatis bertenaga Gemini. Kehadiran saat ini stabil di **${Math.round(metrics.activeHadir / (metrics.totalTeachers || 1) * 100)}%**. Kelalaian: ${metrics.terlambatCount} keterlambatan terdeteksi hari ini.`;
  }
}

// server.ts
var app2 = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
var JWT_SECRET = process.env.JWT_SECRET || "STAS_AL_WILDAN_SUPER_SECRET_KEY";
var QR_SIGN_KEY = "STAS_QR_BSD_SIGN_KEY";
app2.use(import_express.default.json({ limit: "10mb" }));
function generateQRValue(id) {
  const hash = import_crypto.default.createHash("sha256").update(id + QR_SIGN_KEY).digest("hex");
  return `${id}|${hash}`;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function getClientIp(req) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  return typeof ip === "string" ? ip.split(",")[0].trim() : String(ip);
}
var verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sesi kehadiran tidak valid. Silakan masuk kembali." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Sesi kehadiran kadaluarsa. Silakan masuk kembali." });
  }
};
syncTeacherListFromFirestore();
app2.get("/api/config", (req, res) => {
  res.json({
    schoolLocation: {
      latitude: -6.3135,
      longitude: 106.6947,
      radius: 50
      // 50 Meters geofence
    },
    firebaseConfig: clientFirebaseConfig,
    isRealDb: isRealFirebaseConnected
  });
});
app2.post("/api/auth/login", async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: "ID Guru dan sandi wajib diisi." });
  }
  try {
    const teachers = getCachedTeachers();
    const teacher = teachers.find((t) => t.id.toLowerCase() === id.toLowerCase().trim() && t.isActive);
    if (!teacher) {
      await dbAddAuditLog({
        userId: id.trim(),
        action: "LOGIN_FAILURE",
        description: `Percobaan masuk gagal: ID "${id}" tidak terdaftar atau dinonaktifkan.`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ipAddress: getClientIp(req)
      });
      return res.status(401).json({ error: "ID Guru tidak terdaftar atau dinonaktifkan." });
    }
    let isMatch = import_bcryptjs3.default.compareSync(password, teacher.passwordHash);
    if (!isMatch) {
      isMatch = import_bcryptjs3.default.compareSync(password.toLowerCase().trim(), teacher.passwordHash);
    }
    console.log("LOGIN USER:", teacher.id);
    console.log("PASSWORD INPUT:", password);
    console.log("PASSWORD HASH:", teacher.passwordHash);
    console.log("BCRYPT RESULT:", isMatch);
    if (!isMatch) {
      await dbAddAuditLog({
        userId: teacher.id,
        action: "LOGIN_FAILURE",
        description: `Percobaan masuk gagal untuk ${teacher.name} (${teacher.id}): Sandi salah.`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ipAddress: getClientIp(req)
      });
      return res.status(401).json({ error: "Sandi salah. Silakan coba kembali." });
    }
    const isFirstLogin = password.toLowerCase().trim() === teacher.id.toLowerCase().trim();
    const token = import_jsonwebtoken.default.sign(
      {
        id: teacher.id,
        name: teacher.name,
        role: teacher.role,
        commission: teacher.commission,
        mustChangePassword: teacher.mustChangePassword || isFirstLogin
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    await dbAddAuditLog({
      userId: teacher.id,
      action: "LOGIN",
      description: `${teacher.name} (${teacher.role}) berhasil masuk ke sistem STAS.`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.post("/api/auth/change-password", verifyToken, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "Sandi baru minimal berukuran 4 karakter." });
  }
  try {
    const hashed = import_bcryptjs3.default.hashSync(newPassword, 10);
    await dbUpdateTeacher(req.user.id, { passwordHash: hashed, mustChangePassword: false });
    updateTeacherInCache(req.user.id, { passwordHash: hashed, mustChangePassword: false });
    await dbAddAuditLog({
      userId: req.user.id,
      action: "PASSWORD_CHANGE",
      description: `Guru mengubah sandi default untuk peningkatan keamanan MFA.`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({ success: true, message: "Kata sandi berhasil diperbarui." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.get("/api/auth/me", verifyToken, (req, res) => {
  const teachers = getCachedTeachers();
  const teacher = teachers.find((t) => t.id === req.user.id);
  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found." });
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
app2.get("/api/teachers", verifyToken, (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Akses terbatas untuk administrator saja." });
  }
  res.json(getCachedTeachers());
});
app2.post("/api/teachers", verifyToken, async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Hak cipta CRUD hanya dimiliki oleh Super Admin." });
  }
  const { id, name, commission, role } = req.body;
  if (!id || !name || !commission || !role) {
    return res.status(400).json({ error: "Formulir guru baru belum lengkap." });
  }
  const teachers = getCachedTeachers();
  if (teachers.some((t) => t.id.toLowerCase() === id.toLowerCase().trim())) {
    return res.status(400).json({ error: "ID Guru sudah terdaftar di sistem." });
  }
  try {
    const defaultPassword = id.toLowerCase().trim();
    const defaultHash = import_bcryptjs3.default.hashSync(defaultPassword, 10);
    const qrVal = generateQRValue(id);
    const newTeacher = {
      id: id.trim(),
      name: name.trim(),
      passwordHash: defaultHash,
      role,
      commission: commission.trim(),
      qrValue: qrVal,
      isActive: true,
      mustChangePassword: true
    };
    console.log("NEW TEACHER CREATED:", newTeacher);
    await dbCreateTeacher(newTeacher);
    addTeacherToCache(newTeacher);
    await dbAddAuditLog({
      userId: req.user.id,
      action: "CRUD_CREATE",
      description: `Super Admin menambahkan guru baru: ${name} (${id})`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json(newTeacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.put("/api/teachers/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Hak cipta CRUD hanya dimiliki oleh Super Admin." });
  }
  const { name, commission, role, isActive } = req.body;
  try {
    const id = req.params.id;
    const teachersList = getCachedTeachers();
    const existingTeacher = teachersList.find((t) => t.id === id);
    let actionStr = "CRUD_UPDATE";
    let descStr = `Super Admin memperbarui guru ID ${id}`;
    if (existingTeacher && isActive !== void 0 && existingTeacher.isActive !== isActive) {
      actionStr = isActive ? "TEACHER_ACTIVATE" : "TEACHER_DEACTIVATE";
      descStr = `Super Admin ${isActive ? "mengaktifkan" : "menonaktifkan"} guru: ${existingTeacher.name} (${id})`;
    }
    await dbUpdateTeacher(id, { name, commission, role, isActive });
    updateTeacherInCache(id, { name, commission, role, isActive });
    await dbAddAuditLog({
      userId: req.user.id,
      action: actionStr,
      description: descStr,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.delete("/api/teachers/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Hak cipta CRUD hanya dimiliki oleh Super Admin." });
  }
  try {
    const id = req.params.id;
    const teachersList = getCachedTeachers();
    const existingTeacher = teachersList.find((t) => t.id === id);
    const teacherName = existingTeacher ? existingTeacher.name : id;
    await dbDeleteTeacher(id);
    removeTeacherFromCache(id);
    await dbAddAuditLog({
      userId: req.user.id,
      action: "CRUD_DELETE",
      description: `Super Admin menghapus guru: ${teacherName} (${id})`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({ success: true, message: "Teacher deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.post("/api/teachers/:id/reset-password", verifyToken, async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Hak cipta Reset Sandi hanya dimiliki oleh Super Admin." });
  }
  try {
    const id = req.params.id;
    await dbResetTeacherPassword(id);
    resetTeacherPasswordInCache(id);
    await dbAddAuditLog({
      userId: req.user.id,
      action: "RESET_PASSWORD",
      description: `Melakukan reset sandi untuk Guru ID ${id}. Kembali ke kata sandi awal (ID Guru).`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({ success: true, message: "Password reset to default matching ID." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.get("/api/calendar/status", async (req, res) => {
  try {
    const events = await dbGetCalendar();
    const result = evaluateSchoolStatus(events);
    res.json({
      status: result.status,
      activeEvent: result.activeEvent,
      events
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.post("/api/attendance/check", verifyToken, async (req, res) => {
  const { latitude, longitude, accuracy, checkType, qrValue, deviceInfo, attendanceMode } = req.body;
  if (!checkType || !["CHECK_IN", "CHECK_OUT"].includes(checkType)) {
    return res.status(400).json({ error: "Tipe absensi (Check In / Check Out) tidak sah." });
  }
  try {
    const events = await dbGetCalendar();
    const calendarEval = evaluateSchoolStatus(events);
    if (calendarEval.status === "LIBUR") {
      return res.status(400).json({
        error: `Absensi tidak tersedia. Hari ini diliburkan untuk: ${calendarEval.activeEvent?.kegiatan || "Aktivitas Libur"}`
      });
    }
    const isWFH = calendarEval.status === "WFH";
    let finalDistance = 0;
    if (!isWFH && attendanceMode !== "QR Only") {
      if (latitude === void 0 || longitude === void 0) {
        return res.status(400).json({ error: "Sinyal GPS terputus. Harap izinkan pelacakan lokasi akurasi tinggi." });
      }
      if (accuracy > 100) {
        return res.status(400).json({ error: "GPS tidak valid. Aktifkan lokasi akurasi tinggi (Akurasi GPS saat ini > 100m)." });
      }
      finalDistance = calculateDistance(latitude, longitude, -6.3135, 106.6947);
      if (finalDistance > 50) {
        return res.status(400).json({
          error: `Lokasi Anda berada di luar cakupan sekolah Al-Wildan BSD (${Math.round(finalDistance)} meter). Geofence radius limit: 50 Meter.`
        });
      }
    }
    if (attendanceMode === "GPS + QR" || attendanceMode === "QR Only" || isWFH) {
      if (!qrValue) {
        return res.status(400).json({ error: "Pemindaian kartu QR Sekolah wajib diselesaikan." });
      }
      const expectedQR = generateQRValue(req.user.id);
      if (qrValue !== expectedQR) {
        return res.status(400).json({ error: "Audit QR Gagal. Kartu QR tidak cocok atau milik pengajar lain." });
      }
    }
    const currentList = await dbGetAttendance();
    const todayStrInLocal = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const hasDoubleRecord = currentList.some((record) => {
      const recordDate = new Date(record.timestamp).toISOString().split("T")[0];
      return record.teacherId === req.user.id && record.checkType === checkType && recordDate === todayStrInLocal;
    });
    if (hasDoubleRecord) {
      return res.status(400).json({
        error: `Anti-Fraud: Anda terdeteksi sudah melakukan ${checkType === "CHECK_IN" ? "Check-In" : "Check-Out"} untuk hari ini.`
      });
    }
    const today = /* @__PURE__ */ new Date();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    let recordStatus = "HADIR";
    if (checkType === "CHECK_IN") {
      if (currentHour > 7 || currentHour === 7 && currentMinute > 7) {
        recordStatus = "TERLAMBAT";
      }
    } else {
      if (currentHour < 16) {
        recordStatus = "PULANG_CEPAT";
      }
    }
    const newRecord = {
      id: `rc-${Date.now()}-${Math.random().toString(36).substring(3, 8)}`,
      teacherId: req.user.id,
      teacherName: req.user.name,
      role: req.user.role,
      timestamp: today.toISOString(),
      latitude: latitude || -6.3135,
      longitude: longitude || 106.6947,
      distance: finalDistance,
      attendanceMode: isWFH ? "QR Only (WFH MODE)" : attendanceMode || "GPS + QR",
      checkType,
      status: recordStatus,
      deviceInfo: deviceInfo || "STAS Client App v1",
      createdAt: today.toISOString()
    };
    await dbAddAttendance(newRecord);
    await appendAttendanceToSheets(newRecord);
    await dbAddAuditLog({
      userId: req.user.id,
      action: checkType,
      description: `Guru menyelesaikan absensi ${checkType} dengan status ${recordStatus}. (${isWFH ? "WFH Mode" : `Akurasi GPS: ${accuracy || 0}m`})`,
      timestamp: today.toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({
      success: true,
      record: newRecord
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.post("/api/attendance/correction", verifyToken, async (req, res) => {
  const { correctionDate, type, reason, attachment } = req.body;
  if (!correctionDate || !type || !reason) {
    return res.status(400).json({ error: "Kelengkapan isian koreksi belum terpenuhi." });
  }
  const targetDate = new Date(correctionDate);
  const diffTime = Math.abs((/* @__PURE__ */ new Date()).getTime() - targetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  if (diffDays > 3) {
    return res.status(400).json({ error: "Koreksi ditolak. Batas pengajuan dispensasi absensi maksimal 3 hari kerja." });
  }
  try {
    const correction = {
      id: `tc-${Date.now()}`,
      teacherId: req.user.id,
      teacherName: req.user.name,
      correctionDate,
      type,
      reason,
      attachment,
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await dbAddCorrection(correction);
    await dbAddAuditLog({
      userId: req.user.id,
      action: "CORRECTION_SUBMIT",
      description: `Guru mengajukan surat koreksi absensi untuk tanggal ${correctionDate}.`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json(correction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.get("/api/attendance/corrections", verifyToken, async (req, res) => {
  try {
    const list = await dbGetCorrections();
    if (req.user.role === "GURU") {
      return res.json(list.filter((c) => c.teacherId === req.user.id));
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.post("/api/attendance/corrections/:id/approve", verifyToken, async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Akses persetujuan dibatasi." });
  }
  const { decision } = req.body;
  if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
    return res.status(400).json({ error: "Keputusan approval tidak lengkap." });
  }
  try {
    await dbUpdateCorrection(req.params.id, {
      status: decision,
      approvedBy: req.user.name
    });
    const correctionsList = await dbGetCorrections();
    const currCorrection = correctionsList.find((c) => c.id === req.params.id);
    if (decision === "APPROVED" && currCorrection) {
      const corrRecord = {
        id: `rc-corr-${Date.now()}`,
        teacherId: currCorrection.teacherId,
        teacherName: currCorrection.teacherName,
        role: "GURU",
        timestamp: `${currCorrection.correctionDate}T07:00:00Z`,
        latitude: -6.3135,
        longitude: 106.6947,
        distance: 0,
        attendanceMode: "GPS + QR",
        checkType: currCorrection.type === "LUPA_CHECKIN" ? "CHECK_IN" : "CHECK_OUT",
        status: "HADIR",
        deviceInfo: `System Manual Sync (Approved by Admin: ${req.user.name})`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await dbAddAttendance(corrRecord);
      await appendAttendanceToSheets(corrRecord);
    }
    await dbAddAuditLog({
      userId: req.user.id,
      action: `CORRECTION_${decision}`,
      description: `Admin ${req.user.name} menyetujui/menolak koreksi absensi ID ${req.params.id}.`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ipAddress: getClientIp(req)
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.get("/api/dashboard/summary", async (req, res) => {
  try {
    const teachers = getCachedTeachers();
    const totalTeachers = teachers.filter((t) => t.role === "GURU").length;
    const attendances = await dbGetAttendance();
    const todayLocalStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayRecords = attendances.filter(
      (record) => new Date(record.timestamp).toISOString().split("T")[0] === todayLocalStr
    );
    const checkIns = todayRecords.filter((r) => r.checkType === "CHECK_IN");
    const checkOuts = todayRecords.filter((r) => r.checkType === "CHECK_OUT");
    const hadirCount = checkIns.filter((r) => r.status === "HADIR").length;
    const terlambatCount = checkIns.filter((r) => r.status === "TERLAMBAT").length;
    const pulangCepatCount = checkOuts.filter((r) => r.status === "PULANG_CEPAT").length;
    const activeCheckedInIds = new Set(checkIns.map((r) => r.teacherId));
    const alphaCount = Math.max(0, totalTeachers - activeCheckedInIds.size);
    const belumCheckOutCount = Math.max(0, activeCheckedInIds.size - checkOuts.length);
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      const dayRecords = attendances.filter(
        (r) => new Date(r.timestamp).toISOString().split("T")[0] === str && r.checkType === "CHECK_IN"
      );
      const rate = totalTeachers > 0 ? dayRecords.length / totalTeachers * 100 : 100;
      last7Days.push({
        date: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
        rate: Math.round(rate)
      });
    }
    const teacherCheckInsCount = {};
    attendances.filter((r) => r.checkType === "CHECK_IN" && r.status === "HADIR").forEach((r) => {
      if (!teacherCheckInsCount[r.teacherId]) {
        teacherCheckInsCount[r.teacherId] = { name: r.teacherName, count: 0 };
      }
      teacherCheckInsCount[r.teacherId].count++;
    });
    let topDisciplineName = "Ust. Ahmad Fauzi, S.Pd.I";
    let maxPresent = 0;
    Object.keys(teacherCheckInsCount).forEach((tid) => {
      if (teacherCheckInsCount[tid].count > maxPresent) {
        maxPresent = teacherCheckInsCount[tid].count;
        topDisciplineName = teacherCheckInsCount[tid].name;
      }
    });
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
      feed: todayRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app2.get("/api/audit-logs", verifyToken, async (req, res) => {
  if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Akses log audit dibatasi." });
  }
  try {
    const logs = await dbGetAuditLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production" && process.env.DISABLE_HMR !== "true") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Teacher Attendance Server bound and running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateQRValue
});
//# sourceMappingURL=server.cjs.map
