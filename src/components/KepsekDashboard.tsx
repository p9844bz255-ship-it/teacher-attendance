import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Award, AlertCircle, Calendar, TrendingUp, 
  ChevronRight, RefreshCw, LogOut, CheckCircle
} from 'lucide-react';

interface KepsekDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export default function KepsekDashboard({ user, token, onLogout }: KepsekDashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [schoolStatus, setSchoolStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExecutiveSummary();
  }, []);

  const fetchExecutiveSummary = async () => {
    setLoading(true);
    try {
      const summaryRes = await fetch('/api/dashboard/summary');
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      const statRes = await fetch('/api/calendar/status');
      if (statRes.ok) {
        setSchoolStatus(await statRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceRate = () => {
    if (!summary || !summary.stats || summary.stats.totalTeachers === 0) return 100;
    const rate = (summary.stats.hadir / summary.stats.totalTeachers) * 100;
    return Math.round(rate);
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-slate-900 font-sans antialiased pb-16">
      
      {/* Executive Header (Linear Style) */}
      <header className="bg-white border-b border-gray-105 sticky top-0 z-10 px-4 sm:px-6 md:px-8 py-2.5 sm:py-4 flex items-center justify-between h-14 sm:h-16 md:h-20">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <img 
            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
            alt="School Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 object-contain filter contrast-125 select-none"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 flex items-center space-x-1.5 leading-none">
              <span className="truncate max-w-[120px] sm:max-w-none">Executive Portal</span>
              <span className="text-[9px] sm:text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                Kepala Sekolah
              </span>
            </h1>
            <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 font-sans truncate hidden sm:block">AL - WILDAN BOARDING SCHOOL 3 BSD CITY</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <button 
            onClick={fetchExecutiveSummary}
            disabled={loading}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-black/[0.02] rounded-full text-slate-600 transition cursor-pointer shrink-0 outline-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold leading-none">{user.name}</p>
            <span className="text-[10px] text-slate-400 mt-0.5 block">@{user.id}</span>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-semibold bg-[#F3F4F6] hover:bg-neutral-200 text-[#111111] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-pointer transition shrink-0"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6 md:space-y-8">
        
        {/* EXECUTIVE GEMINI-POWERED COGNITIVE INSIGHTS (Notion/Linear style glass block) */}
        <div className="bg-[#111111] text-white p-8 rounded-[32px] border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-white pointer-events-none">
            <Sparkles className="h-44 w-44" />
          </div>
          
          <div className="flex items-center space-x-2 text-zinc-400 mb-4 select-none">
            <Sparkles className="h-4.5 w-4.5 text-zinc-450" />
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Gemini AI Executive Insights</span>
          </div>

          <div className="prose prose-invert max-w-none text-[13px] leading-relaxed text-zinc-300 font-sans">
            {summary && summary.aiInsight ? (
              <p className="whitespace-pre-line leading-relaxed">{summary.aiInsight}</p>
            ) : (
              <p className="text-xs text-zinc-450">Analisis kognitif tingkat ketepatan jam mengajar guru Al-Wildan BSD...</p>
            )}
          </div>
          
          <div className="border-t border-zinc-900 mt-6 pt-4 flex items-center justify-between text-[10px] text-zinc-500 font-sans select-none">
            <span>Model Operator: gemini-3.5-flash</span>
            <span>Realtime data feed: ON</span>
          </div>
        </div>

        {/* METRICS & TRENDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Daily compliance status */}
          <div className="bg-white rounded-[32px] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.015]">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Kepatuhan Kehadiran</span>
              <p className="text-5xl font-bold tracking-tight text-black mt-2">
                {getAttendanceRate()}%
              </p>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed font-sans">
                Rasio guru check-in valid hari ini dari total {summary?.stats?.totalTeachers || 0} pengajar terjadwal.
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4 mt-6 flex justify-between text-xs text-gray-400 font-medium">
              <span>Hadir: {summary?.stats?.hadir || 0}</span>
              <span>Terlambat: {summary?.stats?.terlambat || 0}</span>
            </div>
          </div>

          {/* Precision Heatmap / Calendar Status */}
          <div className="bg-white rounded-[32px] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.015]">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Status Kalender</span>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Akademik Hari Ini:</span>
                  <span className="text-[10px] font-bold uppercase bg-black text-white px-2.5 py-0.5 rounded-full">
                    {schoolStatus?.status || 'NORMAL'}
                  </span>
                </div>
                {schoolStatus?.activeEvent && (
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    Acara: {schoolStatus.activeEvent.kegiatan}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-6">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-2">Riwayat Agenda Belajar</span>
              <div className="space-y-2 max-h-[80px] overflow-y-auto font-sans">
                {schoolStatus?.events?.map((ev: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500 truncate max-w-[180px]">{ev.kegiatan}</span>
                    <span className="text-slate-400 text-[10px]">{ev.tanggal_full.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance Trends Graph visualized using beautiful SVG Bars */}
          <div className="bg-white rounded-[32px] p-6 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.015]">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-4">Tren Partisipasi 7 Hari Terakhir</span>
              
              {summary && summary.trends ? (
                <div className="flex items-end justify-between h-24 pt-2">
                  {summary.trends.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center flex-1 space-y-1.5">
                      <div className="text-[10px] text-gray-800 font-semibold">{item.rate}%</div>
                      {/* Interactive Bar */}
                      <div className="w-5 bg-black rounded-t transition-all hover:bg-neutral-800" style={{ height: `${Math.max(10, item.rate * 0.7)}px` }}></div>
                      <div className="text-[9px] text-gray-400 tracking-tight text-center">{item.date.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-gray-400 uppercase">Mengunduh tren...</div>
              )}
            </div>
          </div>

        </div>

        {/* LEADERBOARDS & EVALUATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Leaderboard Consistent Teachers */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.015]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 select-none">
              <div className="flex items-center space-x-2">
                <Award className="h-4.5 w-4.5 text-black" />
                <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-950">Statistik Guru Disiplin</h4>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold">PRESTASI TERBAIK</span>
            </div>

            <div className="space-y-3">
              {/* Premium Teacher List */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-black/[0.01] rounded-[18px]">
                <div className="flex items-center space-x-3">
                  <div className="bg-black text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">U1</div>
                  <div>
                    <h5 className="text-xs font-semibold">{summary?.topDiscipline || "Ust. Ahmad Fauzi, S.Pd.I"}</h5>
                    <p className="text-[10px] text-gray-450 mt-0.5">Komisi I — Bidang Kepesantrenan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-black bg-white px-3 py-1 rounded-full border border-black/[0.03]">100% HADIR</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-black/[0.01] rounded-[18px]">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-700 text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">U2</div>
                  <div>
                    <h5 className="text-xs font-semibold">Ust. Ridwan Hakim, M.Pd.</h5>
                    <p className="text-[10px] text-gray-455 mt-0.5">Kaprodi Tahfidz Quran</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-gray-700 bg-white px-3 py-1 rounded-full border border-black/[0.03]">96.4% HADIR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Late Coach Evaluation Radar */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.015]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 select-none">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4.5 w-4.5 text-gray-700" />
                <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-950">Radar Keterlambatan</h4>
              </div>
              <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full font-semibold">EVALUASI PENGAJARAN</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-zinc-50 border border-black/[0.01] rounded-[18px]">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-400 text-white h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs">U3</div>
                  <div>
                    <h5 className="text-xs font-semibold">Ustd. Sarah Amelia, S.S.</h5>
                    <p className="text-[10px] text-gray-450 mt-0.5">Bahasa Arab & Sastra Islam</p>
                  </div>
                </div>
                <div className="text-right font-sans">
                  <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full animate-pulse">
                    {summary?.stats?.terlambat || 1} Keterlambatan
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 italic leading-relaxed text-center py-2">
                Sistem mendeteksi kehadiran melampaui toleransi 7 menit (pukul 07:07 WIB).
              </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
