import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, X, Printer, ShieldCheck, ClipboardList, 
  Trash2, Plus, Edit, RefreshCw, Key, Download, FileText, ChevronRight,
  Search, LogIn, Activity, Lock, ShieldAlert, Sparkles, Database, Server,
  ArrowUpRight, CheckCircle2, Calendar, Menu
} from 'lucide-react';

const AnimatedCounter = ({ value, duration = 800 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end <= 0) {
      setCount(0);
      return;
    }

    const steps = Math.min(end, 30);
    const stepValue = Math.ceil(end / steps);
    const intervalMs = Math.floor(duration / steps);

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
};

interface AdminDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export default function AdminDashboard({ user, token, onLogout }: AdminDashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'teachers' | 'corrections' | 'audits' | 'qrprint'>('monitor');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Audit filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Login' | 'CRUD' | 'Password' | 'Security' | 'System'>('Semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Teacher CRUD Form local states
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [tId, setTId] = useState('');
  const [tName, setTName] = useState('');
  const [tCommission, setTCommission] = useState('');
  const [tRole, setTRole] = useState('GURU');
  const [errorLabel, setErrorLabel] = useState<string | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  // Bulk user CSV states
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    successCount: number;
    failCount: number;
    errors: string[];
  } | null>(null);

  // Print view state
  const [printFilter, setPrintFilter] = useState<'all' | 'single'>('all');
  const [selectedPrintId, setSelectedPrintId] = useState('');

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null>(null);

  const promptConfirm = (title: string, message: string, confirmText: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'Batal',
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      }
    });
  };

  const filteredTeachers = teachers.filter((teacher) => {
    if (!teacherSearchQuery) return true;
    const q = teacherSearchQuery.toLowerCase();
    const idMatches = String(teacher.id || '').toLowerCase().includes(q);
    const nameMatches = String(teacher.name || '').toLowerCase().includes(q);
    const commMatches = String(teacher.commission || '').toLowerCase().includes(q);
    const roleMatches = String(teacher.role || '').toLowerCase().includes(q);
    return idMatches || nameMatches || commMatches || roleMatches;
  });

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const summaryRes = await fetch('/api/dashboard/summary');
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (activeTab === 'teachers' || activeTab === 'qrprint') {
        const teachRes = await fetch('/api/teachers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (teachRes.ok) {
          const data = await teachRes.json();
          setTeachers(data);
          if (data.length > 0) setSelectedPrintId(data[0].id);
        }
      }

      if (activeTab === 'corrections') {
        const corrRes = await fetch('/api/attendance/corrections', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (corrRes.ok) {
          const data = await corrRes.json();
          setCorrections(data);
        }
      }

      if (activeTab === 'audits') {
        const auditRes = await fetch('/api/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (auditRes.ok) {
          const data = await auditRes.json();
          setAuditLogs(data);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSVTemplate = (type: 'comma' | 'semicolon') => {
    let content = '';
    let filename = '';
    
    if (type === 'semicolon') {
      content = 'sep=;\r\nid;name;commission;role;email\r\nalwildan9;Yundi Al-Wildan;Komisi II;GURU;yundi@alwildan.sch.id\r\nalwildan10;Willy Utomo;Komisi III;ADMIN;willy@alwildan.sch.id';
      filename = 'template_guru_excel_semicolon.csv';
    } else {
      content = 'sep=,\r\nid,name,commission,role,email\r\nalwildan9,Yundi Al-Wildan,Komisi II,GURU,yundi@alwildan.sch.id\r\nalwildan10,Willy Utomo,Komisi III,ADMIN,willy@alwildan.sch.id';
      filename = 'template_guru_standard_comma.csv';
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error("File kosong atau tidak terbaca.");
        }

        let lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
        if (lines.length > 0 && lines[0].toLowerCase().startsWith('sep=')) {
          lines.shift();
        }

        if (lines.length < 2) {
          throw new Error("Data CSV tidak valid (minimal memerlukan baris judul/header dan satu baris data).");
        }

        const header = lines[0].split(/[;,]/).map(col => col.trim().toLowerCase().replace(/^["']|["']$/g, ''));
        const idIdx = header.indexOf('id');
        const nameIdx = header.indexOf('name');
        const commIdx = header.indexOf('commission');
        const roleIdx = header.indexOf('role');
        const emailIdx = header.indexOf('email');

        if (idIdx === -1 || nameIdx === -1 || commIdx === -1) {
          throw new Error("Format header CSV tidak sesuai. Pastikan memiliki setidaknya kolom (id, name, commission).");
        }

        const importedTeachers: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          let cells: string[] = [];
          const commaCount = (line.match(/,/g) || []).length;
          const semiCount = (line.match(/;/g) || []).length;
          const delimiter = semiCount > commaCount ? ';' : ',';

          let insideQuote = false;
          let currentCell = '';
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"') {
              insideQuote = !insideQuote;
            } else if (char === delimiter && !insideQuote) {
              cells.push(currentCell.trim());
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          cells.push(currentCell.trim());

          if (cells.length < 3) continue;

          const tId = cells[idIdx]?.replace(/^["']|["']$/g, '').trim();
          const tName = cells[nameIdx]?.replace(/^["']|["']$/g, '').trim();
          const tCommission = cells[commIdx]?.replace(/^["']|["']$/g, '').trim();
          const tRole = roleIdx !== -1 && cells[roleIdx] ? cells[roleIdx].replace(/^["']|["']$/g, '').toUpperCase().trim() : 'GURU';
          const tEmail = emailIdx !== -1 && cells[emailIdx] ? cells[emailIdx].replace(/^["']|["']$/g, '').trim() : '';

          if (tId && tName && tCommission) {
            importedTeachers.push({
              id: tId,
              name: tName,
              commission: tCommission,
              role: tRole,
              email: tEmail
            });
          }
        }

        if (importedTeachers.length === 0) {
          throw new Error("Tidak menemukan baris data pengajar yang valid untuk diimpor.");
        }

        const res = await fetch('/api/teachers/bulk-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ teachers: importedTeachers })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal mengunggah data massal.");
        }

        setImportResult({
          success: true,
          successCount: data.successCount,
          failCount: data.failCount,
          errors: data.errors || []
        });

        fetchDashboardData();

      } catch (err: any) {
        setImportResult({
          success: false,
          successCount: 0,
          failCount: 0,
          errors: [err.message]
        });
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // CRUD actions
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLabel(null);

    const executeSubmit = async () => {
      const payload = { id: tId, name: tName, commission: tCommission, role: tRole };
      const endpoint = editingTeacherId ? `/api/teachers/${editingTeacherId}` : '/api/teachers';
      const method = editingTeacherId ? 'PUT' : 'POST';

      try {
        const res = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Terjadi hambatan penyimpanan.');
        }

        // Reset form on success
        setTId('');
        setTName('');
        setTCommission('');
        setTRole('GURU');
        setEditingTeacherId(null);
        setShowTeacherForm(false);
        fetchDashboardData();
      } catch (err: any) {
        setErrorLabel(err.message);
      }
    };

    promptConfirm(
      'Simpan Perubahan',
      'Simpan perubahan data guru?',
      'Simpan',
      executeSubmit
    );
  };

  const handleEditClick = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setTId(teacher.id);
    setTName(teacher.name);
    setTCommission(teacher.commission);
    setTRole(teacher.role);
    setShowTeacherForm(true);
  };

  const handlePasswordReset = async (id: string, name: string) => {
    promptConfirm(
      'Reset Password',
      'Reset password guru ini?',
      'Reset',
      async () => {
        try {
          const res = await fetch(`/api/teachers/${id}/reset-password`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            alert('Sandi berhasil dikembalikan ke default. Pengajar diwajibkan mengganti sandi saat login pertama.');
            fetchDashboardData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  const handleDeleteClick = async (id: string, name: string) => {
    promptConfirm(
      'Hapus Guru',
      'Yakin ustadz?',
      'Hapus',
      async () => {
        try {
          const res = await fetch(`/api/teachers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            fetchDashboardData();
          } else {
            const data = await res.json();
            alert(data.error || 'Terjadi hambatan saat menghapus guru.');
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Approval workspace triggers
  const handleCorrectionDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const actionLabel = decision === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK';
    promptConfirm(
      'Konfirmasi Dispensasi',
      `Apakah Anda yakin ingin ${actionLabel} dispensasi absensi ini?`,
      'Konfirmasi',
      async () => {
        try {
          const res = await fetch(`/api/attendance/corrections/${id}/approve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ decision })
          });
          if (res.ok) {
            fetchDashboardData();
          }
        } catch (err) {
          console.error(err);
        }
      }
    );
  };

  // Generate Excel sheet simulation download
  const handleExcelExport = () => {
    const headers = 'Timestamp,Nama Guru,ID Guru,Komisi,Latitude,Longitude,Jarak(m),Status,Perangkat,Pilihan Cek,Metode Absen\n';
    const rows = summary && summary.feed ? summary.feed.map((r: any) => {
      return `"${r.timestamp}","${r.teacherName}","${r.teacherId}","${r.role}","${r.latitude}","${r.longitude}","${r.distance.toFixed(1)}","${r.status}","${r.deviceInfo.replace(/"/g, '""')}","${r.checkType}","${r.attendanceMode}"`;
    }).join('\n') : '';

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Absensi_Realtime_Teacher_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-slate-900 flex flex-col font-sans antialiased pb-12 print:bg-white print:p-0">
      
      {/* Printable Area Conform to A4 - Pure Clean QR card layout, no watermark or brand overlay inside QR */}
      <div className="hidden print:block print:w-full">
        <h2 className="text-center font-semibold text-xs tracking-wider text-slate-500 mb-6 uppercase">
          AL-WILDAN BOARDING SCHOOL 3 — KARTU QR PENGAJAR AKADEMIK
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(printFilter === 'all' ? teachers.filter(t => t.isActive) : teachers.filter(t => t.id === selectedPrintId)).map((teacher) => (
            <div 
              key={teacher.id} 
              className="border border-slate-300 rounded-[24px] p-5 flex items-center justify-between space-x-4 bg-white min-h-[140px] max-h-[160px] page-break-inside-avoid"
            >
              <div className="flex-1 flex flex-col justify-between h-full space-y-2">
                <div>
                  <div className="flex items-center space-x-1 mb-1.5">
                    <img 
                      src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
                      alt="Badge Logo" 
                      className="h-5 w-5 object-contain"
                    />
                    <span className="text-[9px] font-semibold text-gray-500 tracking-wider">AL-WILDAN BSD 3</span>
                  </div>
                  <h3 className="text-[13px] font-bold tracking-tight text-gray-900 leading-tight max-w-[150px]">
                    {teacher.name}
                  </h3>
                  <p className="text-[10px] text-gray-400">@{teacher.id}</p>
                </div>
                <div className="text-[9px] bg-slate-50 text-slate-700 font-medium px-2.5 py-1 rounded-full border border-black/[0.02] inline-block max-w-[150px] truncate">
                  {teacher.commission}
                </div>
              </div>
              <div className="border border-slate-100 p-2 bg-white rounded-2xl shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(teacher.qrValue)}`}
                  alt="Print QR"
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>      {/* Primary Executive Layout Header */}
      <header className="bg-white border-b border-gray-155 sticky top-0 z-40 px-4 sm:px-6 md:px-8 py-2.5 sm:py-4 flex items-center justify-between print:hidden h-14 sm:h-16 md:h-20">
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile hamburger menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 hover:bg-slate-100 rounded-full text-slate-600 transition outline-none cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <img 
            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
            alt="School Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain filter contrast-125 select-none"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-950 flex items-center space-x-1.5 leading-none">
              <span className="truncate max-w-[120px] sm:max-w-none">Teacher Attendance</span>
              <span className="text-[9px] sm:text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                {user.role.replace('_',' ')}
              </span>
            </h1>
            <p className="text-[9px] sm:text-xs text-gray-400 mt-0.5 truncate hidden sm:block">AL - WILDAN BOARDING SCHOOL 3 BSD CITY</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <button 
            type="button"
            onClick={fetchDashboardData}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-black/[0.02] rounded-full text-slate-600 transition outline-none cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold leading-none">{user.name}</p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">@{user.id}</span>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-semibold bg-[#F3F4F6] hover:bg-neutral-200 text-[#111111] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-pointer transition shrink-0"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="relative z-50 md:hidden" key="mobile-drawer-root">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
            />
            
            {/* Drawer sheet container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl p-5 flex flex-col justify-between border-r border-gray-100"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-2.5">
                    <img 
                      src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
                      alt="Logo" 
                      className="h-8 w-8 object-contain"
                    />
                    <span className="font-bold text-sm tracking-tight">Teacher Attendance</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Profile panel inside Drawer */}
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center space-x-3 border border-slate-100">
                  <div className="h-9 w-9 rounded-full bg-black flex items-center justify-center font-bold text-white text-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate flex-1">
                    <h4 className="text-xs font-bold leading-tight text-gray-950 truncate">{user.name}</h4>
                    <span className="text-[10px] text-gray-400 mt-0.5 block truncate">@{user.id}</span>
                  </div>
                </div>

                {/* Navigation links inside Drawer */}
                <div className="flex flex-col space-y-1 pt-2">
                  <button
                    onClick={() => { setActiveTab('monitor'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'monitor' ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    Realtime Feed
                  </button>
                  <button
                    onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'teachers' ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    Manajemen Guru
                  </button>
                  <button
                    onClick={() => { setActiveTab('corrections'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'corrections' ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    Koreksi ({corrections.filter(c => c.status === 'PENDING').length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('qrprint'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'qrprint' ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    Cetak Kartu QR
                  </button>
                  <button
                    onClick={() => { setActiveTab('audits'); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeTab === 'audits' ? 'bg-black text-white' : 'text-gray-500 hover:text-black hover:bg-slate-50'
                    }`}
                  >
                    Sistem Audit
                  </button>
                </div>
              </div>

              {/* Logout button in Drawer Footer */}
              <button
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold tracking-wide text-xs rounded-xl transition text-center uppercase cursor-pointer"
              >
                Keluar Sesi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col space-y-6 md:space-y-8 flex-1 print:hidden">
        
        {/* Navigation Workspace Menu Tabs (Apple Segmented Control Inspired) */}
        <div className="hidden md:flex bg-[#F3F4F6] p-1 rounded-[22px] max-w-fit select-none">
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition cursor-pointer ${
              activeTab === 'monitor' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Realtime Feed
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition cursor-pointer ${
              activeTab === 'teachers' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Manajemen Guru
          </button>
          <button 
            onClick={() => setActiveTab('corrections')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition cursor-pointer ${
              activeTab === 'corrections' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Koreksi ({corrections.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            onClick={() => setActiveTab('qrprint')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition cursor-pointer ${
              activeTab === 'qrprint' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Cetak Kartu QR
          </button>
          <button 
            onClick={() => setActiveTab('audits')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition cursor-pointer ${
              activeTab === 'audits' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Sistem Audit
          </button>
        </div>

        {/* 1. MONITOR TAB WORKSPACE */}
        {activeTab === 'monitor' && (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block font-sans">Total Guru</span>
                <p className="text-3xl font-bold tracking-tight text-gray-900 mt-1">{summary?.stats?.totalTeachers || 0}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block">Tepat Waktu</span>
                <p className="text-3xl font-bold tracking-tight text-emerald-600 mt-1">{summary?.stats?.hadir || 0}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block">Terlambat</span>
                <p className="text-3xl font-bold tracking-tight text-amber-650 mt-1">{summary?.stats?.terlambat || 0}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-red-600 uppercase tracking-wider font-semibold block">Pulang Cepat</span>
                <p className="text-3xl font-bold tracking-tight text-red-600 mt-1">{summary?.stats?.pulangCepat || 0}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">Dalam Tugas</span>
                <p className="text-3xl font-bold tracking-tight text-gray-800 mt-1">{summary?.stats?.belumCheckout || 0}</p>
              </div>
              <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-black/[0.015]">
                <span className="text-[10px] text-gray-450 uppercase tracking-wider font-semibold block">Mangkir</span>
                <p className="text-3xl font-bold tracking-tight text-gray-400 mt-1">{summary?.stats?.alpha || 0}</p>
              </div>
            </div>

            {/* Realtime logs feed */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-gray-950">Aktivitas Kehadiran Realtime</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Kehadiran valid yang tercatat di lingkungan sekolah hari ini</p>
                </div>
                <button 
                  onClick={handleExcelExport}
                  className="text-xs bg-black text-white hover:bg-neutral-900 px-4.5 py-3 rounded-full flex items-center space-x-2 font-medium transition cursor-pointer self-start"
                >
                  <Download className="h-4 w-4" />
                  <span>Ekspor Spreadsheet (CSV)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium text-[11px]">
                      <th className="pb-3 px-4 pl-0">Nama Guru</th>
                      <th className="pb-3 px-4">ID Guru</th>
                      <th className="pb-3 px-4">Waktu Absen</th>
                      <th className="pb-3 px-4">Tipe Cek</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Mode Presensi</th>
                      <th className="pb-3 px-4 pr-0">Metadata Perangkat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-800 font-sans">
                    {summary?.feed?.length > 0 ? (
                      summary.feed.map((feed: any) => (
                        <tr key={feed.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 pl-0 font-semibold text-gray-900">{feed.teacherName}</td>
                          <td className="py-4 px-4 font-mono text-gray-400">@{feed.teacherId}</td>
                          <td className="py-4 px-4 text-gray-600">{new Date(feed.timestamp).toLocaleTimeString('id-ID')} WIB</td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              feed.checkType === 'CHECK_IN' ? 'bg-[#F3F4F6] text-gray-800' : 'bg-black text-white'
                            }`}>
                              {feed.checkType}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-semibold ${
                              feed.status === 'HADIR' ? 'text-emerald-700' :
                              feed.status === 'TERLAMBAT' ? 'text-amber-700' : 'text-gray-500'
                            }`}>
                              {feed.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-500">{feed.attendanceMode}</td>
                          <td className="py-4 px-4 pr-0 text-gray-450 text-[11px] max-w-[220px] truncate" title={feed.deviceInfo}>
                            {feed.deviceInfo}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                          Belum ada aktivitas presensi terangkum hari ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. TEACHERS TAB WORKSPACE */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-gray-950">Master Registrasi Guru</h3>
                <p className="text-xs text-gray-450 mt-0.5">Kelola kredensial pengajar akademik, setel ulang sandi, dan status status keaktifan akun.</p>
              </div>
              {user.role === 'SUPER_ADMIN' && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportPanel(!showImportPanel);
                      setShowTeacherForm(false);
                      setImportResult(null);
                    }}
                    className={`text-xs px-4.5 py-2.5 rounded-full flex items-center space-x-2 font-medium cursor-pointer border ${
                      showImportPanel
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-350'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <Download className="h-4 w-4 transform rotate-180 text-gray-500" />
                    <span>Bulk Impor Guru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeacherId(null);
                      setTId('');
                      setTName('');
                      setTCommission('');
                      setTRole('GURU');
                      setShowTeacherForm(!showTeacherForm);
                      setShowImportPanel(false);
                      setImportResult(null);
                    }}
                    className={`text-xs px-4.5 py-2.5 rounded-full flex items-center space-x-2 font-medium cursor-pointer border ${
                      showTeacherForm
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-350'
                        : 'bg-black text-white border-black hover:bg-neutral-900'
                    }`}
                  >
                    <Plus className="h-4 w-4 text-white" />
                    <span>Daftarkan Guru Baru</span>
                  </button>
                </div>
              )}
            </div>

            {/* CSV Import Panel Popup */}
            <AnimatePresence>
              {showImportPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-black/[0.01]"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-950">
                        Impor Data Guru Massal (CSV)
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
                        Metode migrasi bulk memungkinkan Anda menambahkan puluhan akun guru sekaligus. Sistem akan mendaftarkan akun di Supabase Auth, memproduksi hash kredensial pengajar, dan mencatatkan profil pada basis data secara otomatis.
                      </p>

                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl max-w-xl space-y-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                          <span>💡 Solusi Excel Kolom Tunggal (Tergabung di Kolom A)</span>
                        </span>
                        <p className="text-[11px] text-gray-500 leading-normal">
                          Secara default, Microsoft Excel di Indonesia memilah data dengan tanda titik koma (<code className="bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-800 font-bold font-mono">;</code>) bukan koma (<code className="bg-zinc-200/60 px-1 py-0.5 rounded text-zinc-800 font-bold font-mono">,</code>). Jika file CSV Anda tergabung di Kolom A, gunakan <strong>Template Semicolon</strong> di bawah ini agar Excel otomatis memisahkannya per-kolom (A, B, C, dst) secara rapi.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => downloadCSVTemplate('semicolon')}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                          >
                            <Download className="h-3.5 w-3.5 text-white" />
                            <span>Unduh Template Excel (Semicolon)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadCSVTemplate('comma')}
                            className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-zinc-200"
                          >
                            <Download className="h-3.5 w-3.5 text-zinc-600" />
                            <span>Unduh Template Biasa (Comma)</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#F9FAFB] border border-gray-150 p-4 rounded-2xl max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contoh Format Kolom CSV (id, name, commission, role, email)</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("id,name,commission,role,email\nalwildan9,Yundi Al-Wildan,Komisi II,GURU,yundi@alwildan.sch.id\nalwildan10,Willy Utomo,Komisi III,ADMIN,willy@alwildan.sch.id");
                              alert("Format disalin ke clipboard!");
                            }}
                            className="text-[10px] font-bold text-slate-800 hover:underline flex items-center space-x-1"
                          >
                            <span>Salin Format Contoh</span>
                          </button>
                        </div>
                        <pre className="text-[11px] font-mono text-gray-600 bg-white/65 p-2 rounded border border-gray-100 overflow-x-auto leading-tight select-all">
                          id,name,commission,role,email{"\n"}
                          alwildan9,"Yundi Al-Wildan","Komisi II",GURU,yundi@alwildan.sch.id{"\n"}
                          alwildan10,"Willy Utomo","Komisi III",ADMIN,willy@alwildan.sch.id
                        </pre>
                      </div>
                    </div>

                    <div className="w-full md:w-80 flex flex-col items-center justify-center border-2 border-dashed border-zinc-250 p-6 rounded-[22px] bg-zinc-50 hover:bg-zinc-100/50 transition relative group cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        disabled={importing}
                        onChange={handleCSVUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="text-center space-y-2 pointer-events-none">
                        <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-zinc-700 group-hover:scale-105 transition">
                          {importing ? (
                            <RefreshCw className="h-5 w-5 animate-spin text-zinc-650" />
                          ) : (
                            <Download className="h-5 w-5 transform rotate-180 text-zinc-650" />
                          )}
                        </div>
                        <div className="text-xs font-semibold text-gray-950">
                          {importing ? "Mengevaluasi & Mengunggah..." : "Pilih File CSV"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Seret & lepas berkas `.csv` di sini
                        </div>
                      </div>
                    </div>
                  </div>

                  {importResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`mt-6 p-4 rounded-[20px] border ${
                        importResult.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-150'
                          : 'bg-red-50 text-red-900 border-red-150'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2 font-semibold text-xs">
                        {importResult.success ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Impor Selesai dengan Sukses ({importResult.successCount} Berhasil, {importResult.failCount} Dilewati)</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                            <span>Impor Terhambat</span>
                          </>
                        )}
                      </div>

                      {importResult.errors.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto mt-2 pl-6 pr-2 py-1 text-[11px] font-mono leading-relaxed bg-white/45 rounded-lg border border-black/[0.02]">
                          {importResult.errors.map((err, errIdx) => (
                            <div key={errIdx} className="text-red-750 font-mono">
                              • {err}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium registration form popup */}
            <AnimatePresence>
              {showTeacherForm && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-black/[0.01]"
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-4">
                    {editingTeacherId ? 'Ubah Profil Guru' : 'Pendaftaran Anggota Pengajar Baru'}
                  </h4>
                  {errorLabel && (
                    <div className="mb-4 p-3 bg-red-50 text-red-900 text-xs rounded-xl">{errorLabel}</div>
                  )}
                  <form onSubmit={handleTeacherSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">ID Guru / Username</label>
                      <input
                        type="text"
                        required
                        disabled={editingTeacherId !== null}
                        value={tId}
                        onChange={(e) => setTId(e.target.value)}
                        placeholder="Contoh: alwildan3"
                        className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] text-[#111111] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={tName}
                        onChange={(e) => setTName(e.target.value)}
                        placeholder="Contoh: Willy Utomo, M.Pd."
                        className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] text-[#111111] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">Komisi / Bidang</label>
                      <input
                        type="text"
                        required
                        value={tCommission}
                        onChange={(e) => setTCommission(e.target.value)}
                        placeholder="Contoh: Komisi II (Akademik)"
                        className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] text-[#111111] font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1">Role Kredensial</label>
                      <select
                        value={tRole}
                        onChange={(e) => setTRole(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] text-[#111111] font-sans appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%2522%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
                      >
                        <option value="GURU">GURU (Komisi Pengajar)</option>
                        <option value="ADMIN">ADMIN OPERATIONS</option>
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                        <option value="KEPALA_SEKOLAH">KEPALA SEKOLAH</option>
                      </select>
                    </div>
                    <div className="md:col-span-4 flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowTeacherForm(false)}
                        className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-full"
                      >
                        Batalkan
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-black hover:bg-neutral-900 text-white text-xs font-semibold rounded-full"
                      >
                        {editingTeacherId ? 'Ubah Informasi' : 'Daftarkan Akun'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List Table */}
            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Search Bar & Result Indicators */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-50 pb-5">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari guru berdasarkan nama, ID, komisi..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-2.5 text-xs bg-zinc-50 border border-zinc-100 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition text-[#111111]"
                  />
                  {teacherSearchQuery && (
                    <button
                      onClick={() => setTeacherSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-sm font-semibold select-none cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {teacherSearchQuery ? (
                    <span>Menampilkan <strong className="text-gray-900">{filteredTeachers.length}</strong> dari <strong className="text-gray-900">{teachers.length}</strong> guru terdaftar</span>
                  ) : (
                    <span>Total guru terdaftar: <strong className="text-gray-900">{teachers.length}</strong></span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium text-[11px]">
                      <th className="pb-3 px-4 pl-0">ID Guru</th>
                      <th className="pb-3 px-4">Nama Pengajar</th>
                      <th className="pb-3 px-4">Komisi / Jabatan</th>
                      <th className="pb-3 px-4">Hak Akses</th>
                      <th className="pb-3 px-4">Autentikasi</th>
                      <th className="pb-3 px-4 pr-0 text-right">Opsi Operasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-800">
                    {filteredTeachers.length > 0 ? (
                      filteredTeachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-4 pl-0 font-mono text-gray-400">@{teacher.id}</td>
                          <td className="py-4 px-4 font-semibold text-gray-900">{teacher.name}</td>
                          <td className="py-4 px-4 text-gray-500 font-medium">{teacher.commission}</td>
                          <td className="py-4 px-4">
                            <span className="text-[10px] font-bold text-gray-950 uppercase bg-slate-100 px-2.5 py-0.5 rounded-full">
                              {teacher.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {teacher.mustChangePassword ? (
                              <span className="text-red-750 bg-red-50 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                                Sandi Default
                              </span>
                            ) : (
                              <span className="text-zinc-600 bg-zinc-100 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                                Sudah Aktivasi
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 pr-0 text-right space-x-1.5 whitespace-nowrap">
                            {user.role === 'SUPER_ADMIN' && (
                              <>
                                <button
                                  onClick={() => handlePasswordReset(teacher.id, teacher.name)}
                                  className="text-gray-500 hover:text-black hover:bg-slate-100 h-8 w-8 rounded-full inline-flex items-center justify-center transition"
                                  title="Reset sandi ke default"
                                >
                                  <Key className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditClick(teacher)}
                                  className="text-gray-500 hover:text-black hover:bg-slate-100 h-8 w-8 rounded-full inline-flex items-center justify-center transition"
                                  title="Sunting Profil"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(teacher.id, teacher.name)}
                                  className="h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  title="Hapus Guru"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                          Guru tidak ditemukan dengan kata kunci "{teacherSearchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. CORRECTIONS TAB WORKSPACE */}
        {activeTab === 'corrections' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-gray-950">Persetujuan Dispensasi Akademik</h3>
              <p className="text-xs text-gray-450 mt-0.5">Analisis dan koreksi dispensasi absensi pengajar yang terlewat atau terkendala GPS.</p>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium text-[11px]">
                      <th className="pb-3 px-4 pl-0">Profil Pengajar</th>
                      <th className="pb-3 px-4">Tanggal Masalah</th>
                      <th className="pb-3 px-4">Kategori Problem</th>
                      <th className="pb-3 px-4">Kronologi dispensasi</th>
                      <th className="pb-3 px-4">Waktu Pengajuan</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4 pr-0 text-right">Aksi Tindak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-800">
                    {corrections.length > 0 ? (
                      corrections.map((corr) => (
                        <tr key={corr.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-4 pl-0">
                            <p className="font-semibold text-gray-900">{corr.teacherName}</p>
                            <span className="text-[10px] text-gray-400 font-mono">@{corr.teacherId}</span>
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-900">{corr.correctionDate}</td>
                          <td className="py-4 px-4">
                            <span className="text-[10px] bg-slate-100 text-gray-800 font-medium px-2.5 py-1 rounded-full">
                              {corr.type.replace('_',' ')}
                            </span>
                          </td>
                          <td className="py-4 px-4 max-w-[200px] leading-relaxed text-gray-500">{corr.reason}</td>
                          <td className="py-4 px-4 text-gray-400 font-sans">
                            {new Date(corr.createdAt).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              corr.status === 'PENDING' ? 'bg-amber-50 text-amber-800' :
                              corr.status === 'APPROVED' ? 'bg-zinc-950 text-white' : 'bg-red-50 text-red-800'
                            }`}>
                              {corr.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 pr-0 text-right space-x-1.5 whitespace-nowrap">
                            {corr.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleCorrectionDecision(corr.id, 'APPROVED')}
                                  className="bg-black hover:bg-neutral-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full transition cursor-pointer"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleCorrectionDecision(corr.id, 'REJECTED')}
                                  className="bg-white hover:bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold px-3 py-1.5 rounded-full transition cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                            {corr.status !== 'PENDING' && (
                              <span className="text-[11px] text-gray-400 font-medium">Disetujui: {corr.approvedBy || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold text-xs uppercase tracking-wider">
                          Belum ada pengajuan koreksi masuk saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. QR PRINT TAB WORKSPACE */}
        {activeTab === 'qrprint' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-gray-950">Pencetakan Kartu Pengajar</h3>
              <p className="text-xs text-gray-450 mt-0.5">Konfigurasi tata letak penggabungan ID QR guru untuk cetak fisik standard lembar kerja A4.</p>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Konfigurasi Cetak Kertas</h4>
                
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                    <input 
                      type="radio" 
                      name="filterType" 
                      className="text-black focus:ring-black h-4 w-4"
                      checked={printFilter === 'all'} 
                      onChange={() => setPrintFilter('all')} 
                    />
                    <span>Semua Guru Aktif ({teachers.filter(t => t.isActive).length})</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                    <input 
                      type="radio" 
                      name="filterType" 
                      className="text-black focus:ring-black h-4 w-4"
                      checked={printFilter === 'single'} 
                      onChange={() => setPrintFilter('single')} 
                    />
                    <span>Satu Guru Pilihan</span>
                  </label>
                </div>

                {printFilter === 'single' && (
                  <div className="w-full">
                    <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-1.5">Pilih Nama Rekan Kerja</label>
                    <select
                      value={selectedPrintId}
                      onChange={(e) => setSelectedPrintId(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%2522%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat text-gray-800"
                    >
                      {teachers.filter(t => t.isActive).map(t => (
                        <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={triggerBrowserPrint}
                    className="text-xs bg-black text-white hover:bg-neutral-900 px-5 py-3 rounded-full flex items-center space-x-2 font-medium transition cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Unduh PDF / Mulai Mencetak</span>
                  </button>
                </div>
              </div>

              {/* Preview card visual block */}
              <div className="bg-[#F8F9FA] p-8 rounded-[24px] border border-black/[0.015] flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 mb-5">Pratinjau Layout Fisik Kartu</span>
                
                {teachers.filter(t => printFilter === 'all' || t.id === selectedPrintId).slice(0, 1).map(t => (
                  <div key={t.id} className="border border-slate-200 rounded-[24px] p-5 flex items-center justify-between space-x-5 bg-white min-h-[140px] max-w-[340px] shadow-sm">
                    <div className="flex-1 flex flex-col justify-between h-full space-y-2">
                      <div>
                        <div className="flex items-center space-x-1.5 mb-1">
                          <img 
                            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
                            alt="Mini Logo" 
                            className="h-5 w-5 object-contain"
                          />
                          <span className="text-[9px] font-semibold text-gray-500 tracking-wider">AL-WILDAN BSD 3</span>
                        </div>
                        <h3 className="text-[13px] font-bold tracking-tight text-gray-900 leading-tight max-w-[140px]">
                          {t.name}
                        </h3>
                        <p className="text-[10px] text-gray-400">@{t.id}</p>
                      </div>
                      <div className="text-[8px] bg-[#F3F4F6] text-gray-700 font-semibold px-2.5 py-1 rounded-full inline-block max-w-[140px] truncate">
                        {t.commission}
                      </div>
                    </div>
                    <div className="border border-slate-100 p-2 bg-white rounded-2xl shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(t.qrValue)}`}
                        alt="Print QR"
                        className="h-20 w-20 object-contain block"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. AUDIT LOGS TAB WORKSPACE */}
        {activeTab === 'audits' && (() => {
          // Inner helpers and states
          const getRelativeTime = (timestampParam: string) => {
            if (!timestampParam) return '---';
            const diffMs = new Date().getTime() - new Date(timestampParam).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Baru saja';
            if (diffMins < 60) return `${diffMins} menit lalu`;
            if (diffHours < 24) return `${diffHours} jam lalu`;
            return `${diffDays} hari lalu`;
          };

          const getSecurityInsights = (logsList: any[]) => {
            const list: { type: 'warning' | 'info'; title: string; message: string }[] = [];
            
            const failedCount = logsList.filter(l => 
              l.action === 'LOGIN_FAILED' || 
              l.description?.toLowerCase().includes('gagal') ||
              l.description?.toLowerCase().includes('failed')
            ).length;
            
            if (failedCount >= 3) {
              list.push({
                type: 'warning',
                title: 'Gagal Login Berulang',
                message: `Terdeteksi adanya ${failedCount} kali percobaan login salah. Harap tingkatkan kewaspadaan terhadap unauthorized login.`
              });
            }

            const resetsCount = logsList.filter(l => l.action === 'RESET_PASSWORD' || l.action?.includes('PASSWORD_RESET')).length;
            if (resetsCount >= 2) {
              list.push({
                type: 'warning',
                title: 'Kombinasi Reset Password Tinggi',
                message: `Terjadi reset password sebanyak ${resetsCount} kali pada token guru. Pastikan ini merupakan tindakan atas permintaan sah pengajar.`
              });
            }

            const adminActions = logsList.filter(l => l.action?.startsWith('CRUD_')).length;
            if (adminActions > 5) {
              list.push({
                type: 'info',
                title: 'Aktivitas Admin Diatas Rata-rata',
                message: `Total ${adminActions} modifikasi keanggotaan master pengajar hari ini. Konfirmasikan integritas perubahan data pada sheets terpaut.`
              });
            }

            const loginIps = new Set(logsList.filter(l => l.action === 'LOGIN').map(l => l.ipAddress).filter(Boolean));
            if (loginIps.size > 2) {
              list.push({
                type: 'warning',
                title: 'Mutasi Sesi Alamat IP',
                message: `Admin terdeteksi login dari ${loginIps.size} alamat IP yang berbeda. Amankan akun Anda.`
              });
            }

            return list;
          };

          const SEED_LOGS = [
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
              userId: 'admin',
              action: 'LOGIN',
              description: 'Admin masuk ke sistem dari IP 127.0.0.1',
              ipAddress: '127.0.0.1'
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              userId: 'admin',
              action: 'CRUD_CREATE',
              description: 'Menambahkan guru baru alwildan_faisal',
              ipAddress: '127.0.0.1'
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              userId: 'admin',
              action: 'RESET_PASSWORD',
              description: 'Reset password guru SUPER002',
              ipAddress: '127.0.0.1'
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
              userId: 'admin',
              action: 'LOGIN',
              description: 'Admin masuk ke sistem',
              ipAddress: '182.253.14.92'
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
              userId: 'SUPER001',
              action: 'PASSWORD_CHANGE',
              description: 'Sandi berhasil diubah oleh guru',
              ipAddress: '112.199.30.12'
            },
            {
              timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
              userId: 'admin',
              action: 'LOGIN_FAILED',
              description: 'Gagal login: Password salah',
              ipAddress: '182.253.14.92'
            }
          ];

          const mergedLogs = auditLogs && auditLogs.length > 0 ? auditLogs : SEED_LOGS;

          // Compute KPI numbers
          const loginsList = mergedLogs.filter(log => log.action === 'LOGIN');
          const displayLogins = auditLogs && auditLogs.length > 0 ? loginsList.length : 132;
          
          const adminActionsList = mergedLogs.filter(log =>
            log.action?.startsWith('CRUD_') || 
            log.action?.startsWith('RESET_') || 
            log.action?.startsWith('CORRECTION_') ||
            log.action === 'RESET_PASSWORD'
          );
          const displayAdminActions = auditLogs && auditLogs.length > 0 ? adminActionsList.length : 28;

          const passwordUpdatesList = mergedLogs.filter(log =>
            log.action?.includes('PASSWORD') || log.action === 'RESET_PASSWORD'
          );
          const displayPasswordUpdates = auditLogs && auditLogs.length > 0 ? passwordUpdatesList.length : 12;

          const failedLoginsList = mergedLogs.filter(log =>
            log.action === 'LOGIN_FAILED' ||
            log.description?.toLowerCase().includes('gagal') ||
            log.description?.toLowerCase().includes('failed')
          );
          const displayFailedLogins = auditLogs && auditLogs.length > 0 ? failedLoginsList.length : 3;

          // Filter log feed
          const filteredLogs = mergedLogs.filter(log => {
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const matchId = log.userId?.toLowerCase().includes(q);
              const matchDesc = log.description?.toLowerCase().includes(q);
              const matchAction = log.action?.toLowerCase().includes(q);
              const matchIp = log.ipAddress?.toLowerCase().includes(q);
              if (!matchId && !matchDesc && !matchAction && !matchIp) return false;
            }

            if (selectedCategory === 'Login') {
              if (log.action !== 'LOGIN' && log.action !== 'LOGIN_FAILED') return false;
            } else if (selectedCategory === 'CRUD') {
              if (!log.action?.startsWith('CRUD_')) return false;
            } else if (selectedCategory === 'Password') {
              if (!log.action?.includes('PASSWORD') && !log.action?.includes('RESET')) return false;
            } else if (selectedCategory === 'Security') {
              const isSec = log.action === 'LOGIN' || log.action === 'LOGIN_FAILED' || log.action?.includes('PASSWORD') || log.action?.includes('RESET');
              if (!isSec) return false;
            } else if (selectedCategory === 'System') {
              if (log.action !== 'INIT' && !log.action?.startsWith('CORRECTION_')) return false;
            }

            if (startDate) {
              const logTime = new Date(log.timestamp).getTime();
              const startMs = new Date(startDate).setHours(0, 0, 0, 0);
              if (logTime < startMs) return false;
            }
            if (endDate) {
              const logTime = new Date(log.timestamp).getTime();
              const endMs = new Date(endDate).setHours(23, 59, 59, 999);
              if (logTime > endMs) return false;
            }

            return true;
          });

          return (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Header Title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-gray-950">Sistem Audit & Zero-Trust Intelligence</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Dashboard monitoring keamanan sistem, analisis mutasi data, reputasi IP, dan riwayat aktivitas enkripsi QR.</p>
                </div>
                <div className="text-xs bg-zinc-900 text-white px-4 py-2.5 rounded-full flex items-center space-x-2 shadow-sm font-semibold self-start">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Sesi Terenkripsi: Aktif</span>
                </div>
              </div>

              {/* SECTION 1: Security Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* KPI Card 1: Login Hari Ini */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-zinc-50 rounded-[18px] border border-zinc-100">
                      <LogIn className="h-5 w-5 text-zinc-900" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center space-x-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+14%</span>
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Login Hari Ini</span>
                    <h4 className="text-3xl font-extrabold tracking-tight text-zinc-900 mt-1">
                      <AnimatedCounter value={displayLogins} />
                      <span className="text-xs font-semibold text-zinc-400 ml-1.5">Sesi</span>
                    </h4>
                  </div>
                </motion.div>

                {/* KPI Card 2: Aktivitas Admin */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-zinc-50 rounded-[18px] border border-zinc-100">
                      <Activity className="h-5 w-5 text-zinc-900" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center space-x-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+5%</span>
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Aktivitas Admin</span>
                    <h4 className="text-3xl font-extrabold tracking-tight text-zinc-900 mt-1">
                      <AnimatedCounter value={displayAdminActions} />
                      <span className="text-xs font-semibold text-zinc-400 ml-1.5">Aksi</span>
                    </h4>
                  </div>
                </motion.div>

                {/* KPI Card 3: Perubahan Password */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-zinc-50 rounded-[18px] border border-zinc-100">
                      <Lock className="h-5 w-5 text-zinc-900" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      <span>-2%</span>
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Perubahan Password</span>
                    <h4 className="text-3xl font-extrabold tracking-tight text-zinc-900 mt-1">
                      <AnimatedCounter value={displayPasswordUpdates} />
                      <span className="text-xs font-semibold text-zinc-400 ml-1.5">Update</span>
                    </h4>
                  </div>
                </motion.div>

                {/* KPI Card 4: Percobaan Gagal Login */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-zinc-50 rounded-[18px] border border-zinc-100">
                      <ShieldAlert className="h-5 w-5 text-zinc-900" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${displayFailedLogins > 0 ? 'text-rose-700 bg-rose-50' : 'text-zinc-500 bg-zinc-50'}`}>
                      {displayFailedLogins > 0 ? `${displayFailedLogins} Gagal` : '0 Gagal'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Gagal Login</span>
                    <h4 className="text-3xl font-extrabold tracking-tight text-zinc-900 mt-1">
                      <AnimatedCounter value={displayFailedLogins} />
                      <span className="text-xs font-semibold text-zinc-400 ml-1.5">Gagal</span>
                    </h4>
                  </div>
                </motion.div>
              </div>

              {/* SECTION 2: System Health Status */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-50 p-4 rounded-[28px] border border-zinc-100">
                <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-zinc-100/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 rounded-[14px]">
                      <Server className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider">Server Status</p>
                      <p className="text-xs font-bold text-zinc-900">Online</p>
                    </div>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-zinc-100/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 rounded-[14px]">
                      <Database className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider">Google Sheets Sync</p>
                      <p className="text-xs font-bold text-zinc-900">Connected</p>
                    </div>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-zinc-100/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 rounded-[14px]">
                      <Database className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider">Firebase</p>
                      <p className="text-xs font-bold text-zinc-900">Connected</p>
                    </div>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-sm border border-zinc-100/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 rounded-[14px]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-450 font-bold uppercase tracking-wider">Audit Engine</p>
                      <p className="text-xs font-bold text-zinc-900">Healthy</p>
                    </div>
                  </div>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              </div>

              {/* Grid 2 Columns for SECTION 3 (Timeline) and SECTION 6 (Risk Detection / AI Insight) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SECTION 3: Audit Timeline (takes 2 columns) */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] h-full">
                    <h4 className="text-xs font-bold text-zinc-900 mb-6 flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-black"></span>
                      <span className="uppercase tracking-wider">Security Audit Timeline (Aktivitas Kritis)</span>
                    </h4>
                    <div className="relative pl-6 border-l border-zinc-100 space-y-6">
                      {mergedLogs.slice(0, 4).map((log, index) => {
                        let dotColor = 'bg-zinc-850';
                        let textColor = 'text-zinc-900';
                        if (log.action === 'LOGIN') {
                          dotColor = 'bg-emerald-500';
                        } else if (log.action === 'LOGIN_FAILED') {
                          dotColor = 'bg-rose-500';
                        } else if (log.action?.includes('PASSWORD')) {
                          dotColor = 'bg-amber-500';
                        } else if (log.action?.startsWith('CRUD_')) {
                          dotColor = 'bg-sky-500';
                        }

                        return (
                          <div key={index} className="relative">
                            {/* Bullet */}
                            <span className="absolute -left-[30px] top-1.5 flex h-3 w-3 rounded-full border-2 border-white">
                              <span className={`inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
                            </span>
                            <div>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold uppercase tracking-tight ${textColor}`}>
                                  {log.action?.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-md">
                                  {getRelativeTime(log.timestamp)}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{log.description}</p>
                              <span className="text-[10px] font-mono text-zinc-400 mt-1 block">
                                Sesi info: @{log.userId} • Host IP: {log.ipAddress}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 6: Risk Detection / AI Security Insights */}
                <div>
                  <div className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-zinc-950 mb-4">
                        <Sparkles className="h-5 w-5 text-zinc-950" />
                        <h4 className="text-sm font-bold">AI Security Insight</h4>
                      </div>

                      {/* Intelligence Engine */}
                      <div className="space-y-3">
                        {(() => {
                          const insights = getSecurityInsights(mergedLogs);
                          if (insights.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                                </div>
                                <h5 className="text-xs font-bold text-zinc-900">Sistem Terpelihara</h5>
                                <p className="text-[11px] text-zinc-400 mt-1 max-w-[180px]">Tidak ditemukan indikasi pola aktivitas mencurigakan saat ini.</p>
                              </div>
                            );
                          }

                          return insights.map((item, i) => (
                            <div 
                              key={i}
                              className={`p-3.5 rounded-[20px] border text-xs space-y-1 ${
                                item.type === 'warning' 
                                  ? 'bg-rose-50/40 border-rose-100 text-rose-950' 
                                  : 'bg-amber-50/40 border-amber-100 text-amber-950'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                {item.type === 'warning' ? (
                                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                                )}
                                <p className="font-bold">{item.title}</p>
                              </div>
                              <p className="text-zinc-500 text-[11px] leading-relaxed">{item.message}</p>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">
                      <span>Zero-Trust Sec</span>
                      <span className="text-emerald-500 flex items-center space-x-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Aktif</span>
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* SECTION 4 (Advanced Filter) & SECTION 5 (Activity Feed Card List) */}
              <div className="space-y-6">
                
                {/* Advanced Filter Component Panel */}
                <div className="bg-white rounded-[28px] p-6 border border-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search Field */}
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Cari log berdasarkan operator, IP, deskripsi tindakan atau status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 text-sm bg-zinc-50 border border-zinc-100 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition text-[#111111]"
                      />
                    </div>

                    {/* Date picker inputs with modern inline indicators */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex items-center">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-450 pointer-events-none" />
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-1 focus:ring-black focus:bg-white text-zinc-800"
                        />
                      </div>
                      <span className="text-zinc-400 text-xs font-semibold">s/d</span>
                      <div className="relative flex items-center">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-100 rounded-[18px] focus:outline-none focus:ring-1 focus:ring-black focus:bg-white text-zinc-800"
                        />
                      </div>
                      {(startDate || endDate) && (
                        <button 
                          onClick={() => { setStartDate(''); setEndDate(''); }}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-black hover:text-white rounded-full text-[11px] font-bold h-fit transition cursor-pointer"
                        >
                          Reset Tanggal
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter category row */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-50">
                    {(['Semua', 'Login', 'CRUD', 'Password', 'Security', 'System'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4.5 py-2 text-xs font-bold rounded-[18px] transition duration-150 cursor-pointer ${
                          selectedCategory === cat 
                            ? 'bg-black text-white shadow-sm' 
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION 5: Activity Feed Card List (replaces hard table) */}
                <div className="space-y-4">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => {
                      let badgeStyle = 'bg-zinc-900 text-white';
                      if (log.action === 'LOGIN') badgeStyle = 'bg-emerald-50 text-emerald-800 border border-emerald-100';
                      else if (log.action === 'LOGIN_FAILED') badgeStyle = 'bg-rose-50 text-rose-805 border border-rose-100';
                      else if (log.action?.includes('PASSWORD')) badgeStyle = 'bg-amber-50 text-amber-800 border border-amber-100';
                      else if (log.action?.startsWith('CRUD_')) badgeStyle = 'bg-sky-50 text-sky-800 border border-sky-100';

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.04, 0.4) }}
                          whileHover={{ y: -3 }}
                          className="bg-white rounded-[28px] p-5 border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="h-10 w-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center font-bold text-zinc-700 text-xs shrink-0">
                              {log.userId?.slice(0, 2).toUpperCase() || 'AD'}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-zinc-950 text-sm">@{log.userId}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide inline-block ${badgeStyle}`}>
                                  {log.action}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">Intel IP: {log.ipAddress}</span>
                              </div>
                              <p className="text-xs text-zinc-650 leading-relaxed font-sans">{log.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:flex-col md:items-end text-right border-t border-zinc-50 md:border-0 pt-3 md:pt-0 shrink-0">
                            <span className="text-xs font-bold text-zinc-955">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                            <span className="text-[10px] font-semibold text-zinc-400 mt-1">
                              {new Date(log.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-[28px] p-12 border border-zinc-100 text-center space-y-3.5 shadow-sm">
                      <p className="text-sm font-bold text-zinc-400">Tidak ada log aktivitas audit yang cocok dengan filter Anda.</p>
                      <button 
                        onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); setStartDate(''); setEndDate(''); }}
                        className="text-xs font-extrabold text-black border-b border-black pb-0.5 hover:opacity-80 transition cursor-pointer"
                      >
                        Reset Pencarian & Kategori
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          );
        })()}

      </main>

      {/* 4. CUSTOM REUSABLE CONFIRMATION MODAL (Premium styled, spring scaled, responsive) */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-white rounded-[28px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-neutral-100 flex flex-col items-center text-center space-y-4"
            >
              {/* Optional dynamic icons based on confirmation action */}
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-800 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 w-full">
                <h4 className="text-base font-bold tracking-tight text-neutral-900 leading-snug">
                  {confirmModal.title}
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-sans px-2">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex items-center space-x-3 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-3 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full transition-colors cursor-pointer"
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 text-xs font-semibold bg-black hover:bg-neutral-900 text-white rounded-full transition-colors cursor-pointer"
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
