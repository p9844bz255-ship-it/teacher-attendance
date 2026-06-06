import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, X, Printer, ShieldCheck, ClipboardList, 
  Trash2, Plus, Edit, RefreshCw, Key, Download, FileText, ChevronRight
} from 'lucide-react';

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

  // Teacher CRUD Form local states
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [tId, setTId] = useState('');
  const [tName, setTName] = useState('');
  const [tCommission, setTCommission] = useState('');
  const [tRole, setTRole] = useState('GURU');
  const [errorLabel, setErrorLabel] = useState<string | null>(null);

  // Print view state
  const [printFilter, setPrintFilter] = useState<'all' | 'single'>('all');
  const [selectedPrintId, setSelectedPrintId] = useState('');

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

  // CRUD actions
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLabel(null);

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

  const handleEditClick = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setTId(teacher.id);
    setTName(teacher.name);
    setTCommission(teacher.commission);
    setTRole(teacher.role);
    setShowTeacherForm(true);
  };

  const handlePasswordReset = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menyetel ulang kata sandi milik ${name} ke sandi default (ID Guru)?`)) return;
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
  };

  const handleDeactivate = async (id: string, activeState: boolean) => {
    if (!confirm(`Ubah status aktif guru ID ${id}?`)) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !activeState })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approval workspace triggers
  const handleCorrectionDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const confirmation = confirm(`Apakah Anda yakin ingin ${decision === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK'} dispensasi absensi ini?`);
    if (!confirmation) return;

    try {
      const res = await fetch(`/api/attendance/corrections/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ decision })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchDashboardData();
    } catch (err: any) {
       alert(err.message);
    }
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
    link.setAttribute('download', `Laporan_Absensi_Realtime_STAS_${new Date().toISOString().split('T')[0]}.csv`);
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
      </div>

      {/* Primary Executive Layout Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 px-8 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <img 
            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
            alt="School Logo" 
            className="h-10 w-10 object-contain filter contrast-125"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-900 flex items-center space-x-2">
              <span>Smart Admin Space</span>
              <span className="text-[10px] bg-black text-white px-2.5 py-0.5 rounded-full font-semibold">
                {user.role.replace('_',' ')}
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">AL - WILDAN BOARDING SCHOOL 3 BSD CITY</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={fetchDashboardData}
            className="p-2 hover:bg-slate-50 border border-black/[0.02] rounded-full text-slate-600 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="text-right">
            <p className="text-xs font-bold leading-none">{user.name}</p>
            <span className="text-[10px] text-gray-400 mt-0.5 block">@{user.id}</span>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-medium bg-[#F3F4F6] hover:bg-neutral-200 text-[#111111] px-4 py-2 rounded-full transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Container body */}
      <main className="max-w-7xl mx-auto w-full px-8 py-8 flex flex-col space-y-8 flex-1 print:hidden">
        
        {/* Navigation Workspace Menu Tabs (Apple Segmented Control Inspired) */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-[22px] max-w-fit select-none">
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition ${
              activeTab === 'monitor' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Realtime Feed
          </button>
          <button 
            onClick={() => setActiveTab('teachers')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition ${
              activeTab === 'teachers' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Manajemen Guru
          </button>
          <button 
            onClick={() => setActiveTab('corrections')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition ${
              activeTab === 'corrections' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Koreksi ({corrections.filter(c => c.status === 'PENDING').length})
          </button>
          <button 
            onClick={() => setActiveTab('qrprint')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition ${
              activeTab === 'qrprint' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Cetak Kartu QR
          </button>
          <button 
            onClick={() => setActiveTab('audits')}
            className={`px-5 py-2.5 text-xs font-semibold rounded-[18px] transition ${
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
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
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacherId(null);
                    setTId('');
                    setTName('');
                    setTCommission('');
                    setTRole('GURU');
                    setShowTeacherForm(!showTeacherForm);
                  }}
                  className="text-xs bg-black text-white hover:bg-neutral-900 px-4.5 py-2.5 rounded-full flex items-center space-x-2 font-medium cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Daftarkan Guru Baru</span>
                </button>
              )}
            </div>

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
                    {teachers.map((teacher) => (
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
                                onClick={() => handleDeactivate(teacher.id, teacher.isActive)}
                                className={`h-8 w-8 rounded-full inline-flex items-center justify-center transition-colors ${
                                  teacher.isActive ? 'text-gray-405 hover:text-red-650 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={teacher.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
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
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-gray-950">Log Audit Sistem Keamanan</h3>
              <p className="text-xs text-gray-450 mt-0.5">Historis pergeseran data login, password updates, status, dan modifikasi operasional sistem.</p>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-medium text-[11px] sticky top-0 bg-white">
                      <th className="pb-3 px-4 pl-0">Timestamp</th>
                      <th className="pb-3 px-4">Modifikator</th>
                      <th className="pb-3 px-4">Tipe Transaksi</th>
                      <th className="pb-3 px-4">Rincian Perubahan</th>
                      <th className="pb-3 px-4 pr-0">Alamat IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-800 font-sans">
                    {auditLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-4 pl-0 text-gray-450 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 font-mono text-gray-900 font-semibold">@{log.userId}</td>
                        <td className="py-4 px-4">
                          <span className="text-[10px] font-semibold bg-gray-950 text-white px-2.5 py-0.5 rounded-full">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 font-medium leading-relaxed">{log.description}</td>
                        <td className="py-4 px-4 pr-0 font-mono text-gray-400">{log.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
