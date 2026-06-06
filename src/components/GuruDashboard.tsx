import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Camera, MapPin, History, QrCode, AlertTriangle, 
  CheckCircle, RefreshCw, X, LogOut, ChevronRight
} from 'lucide-react';

interface GuruDashboardProps {
  user: any;
  token: string;
  onLogout: () => void;
}

export default function GuruDashboard({ user, token, onLogout }: GuruDashboardProps) {
  const [schoolStatus, setSchoolStatus] = useState<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat?: number; lon?: number; accuracy?: number; distance?: number }>({});
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Attendance modes
  const [config, setConfig] = useState<any>({ schoolLocation: { radius: 50 }, systemMode: 'GPS + QR' });
  const [checkType, setCheckType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [loading, setLoading] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);

  // Correction states
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionType, setCorrectionType] = useState<'LUPA_CHECKIN' | 'LUPA_CHECKOUT' | 'GPS_ERROR' | 'QR_ERROR'>('LUPA_CHECKIN');
  const [correctionReason, setCorrectionReason] = useState('');
  const [corrections, setCorrections] = useState<any[]>([]);
  const [submittingCorr, setSubmittingCorr] = useState(false);

  // QR and scanner states
  const [scanning, setScanning] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);
  const [successRecord, setSuccessRecord] = useState<any>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize data
  useEffect(() => {
    fetchConfigs();
    fetchSchoolStatus();
    fetchCorrections();
    triggerGPSLocation();
  }, []);

  const fetchConfigs = async () => {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
    }
  };

  const fetchSchoolStatus = async () => {
    const res = await fetch('/api/calendar/status');
    if (res.ok) {
      const data = await res.json();
      setSchoolStatus(data);
    }
  };

  const fetchCorrections = async () => {
    const res = await fetch('/api/attendance/corrections', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setCorrections(data);
    }
  };

  // GPS trigger Geolocation callback loop
  const triggerGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Perangkat Anda tidak mendukung fitur lokasi GPS.');
      return;
    }

    setGpsLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        // Calculate distance from BSD Al-Wildan (-6.3135, 106.6947)
        const R = 6371e3; // Earth's radius in meters
        const dLat = (( -6.3135 - lat) * Math.PI) / 180;
        const dLon = ((106.6947 - lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((-6.3135 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;

        setLocation({ lat, lon, accuracy: acc, distance: dist });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setLocationError('Gagal mendeteksi koordinat lokasi. Harap berikan izin GPS.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Launch QR Code scanner using html5-qrcode
  const startScanner = () => {
    setScanning(true);
    setErrorBanner(null);
    setSuccessRecord(null);

    // Give Vite renderer time to mount scan element container Div
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-scanner-element',
          { fps: 15, qrbox: { width: 250, height: 250 } },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          async (qrText) => {
            scanner.clear();
            setScanning(false);
            submitAttendance(qrText);
          },
          (err) => {
            // Optional scanner failures log
          }
        );
      } catch (e) {
        console.error('Scan init error:', e);
        setErrorBanner('Gagal menginisialisasi modul kamera.');
        setScanning(false);
      }
    }, 300);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.warn(e));
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Submits final log check event to server Express API
  const submitAttendance = async (scannedQRValue?: string) => {
    setLoading(true);
    setErrorBanner(null);

    const isWFH = schoolStatus?.status === 'WFH';
    const finalMode = config.systemMode || 'GPS + QR';

    const payload = {
      latitude: location.lat,
      longitude: location.lon,
      accuracy: location.accuracy || 45,
      checkType,
      qrValue: scannedQRValue,
      deviceInfo: navigator.userAgent,
      attendanceMode: finalMode
    };

    try {
      const res = await fetch('/api/attendance/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi Absensi Ditolak.');
      }

      setSuccessRecord(data.record);
      if (checkType === 'CHECK_IN') setCheckedInToday(true);
      if (checkType === 'CHECK_OUT') setCheckedOutToday(true);

      // Trigger calendar events
      fetchSchoolStatus();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submission for Teacher Compensation Dispense requests
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionDate || !correctionReason) {
      setErrorBanner('Tangal dan alasan dispensasi wajib dilengkapi.');
      return;
    }

    setSubmittingCorr(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/attendance/correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          correctionDate,
          type: correctionType,
          reason: correctionReason
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      setCorrectionReason('');
      fetchCorrections();
      alert('Pengajuan koreksi kehadiran berhasil dikirim ke Admin STAS Al-Wildan.');
    } catch (err: any) {
       setErrorBanner(err.message);
    } finally {
      setSubmittingCorr(false);
    }
  };

  // Check geofence variables constraints
  const isWFH = schoolStatus?.status === 'WFH';
  const isLibur = schoolStatus?.status === 'LIBUR';
  const isGpsValid = location.accuracy !== undefined && location.accuracy <= 100;
  const isWithinGeofence = isWFH || (location.distance !== undefined && location.distance <= 50);
  const canScan = isWFH || (isGpsValid && isWithinGeofence);

  return (
    <div className="bg-[#FCFCFC] min-h-screen text-[#111111] font-sans antialiased select-none pb-12">
      {/* Header Profile Info Like Apple/Linear settings page */}
      <header className="bg-white px-6 pt-8 pb-4">
        <div className="max-w-[450px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-[#F3F4F6] text-[#111111] h-14 w-14 rounded-full flex items-center justify-center font-semibold text-lg border border-black/[0.02] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
              {user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium tracking-wide">@{user.id}</p>
              <h2 className="text-base font-semibold text-gray-950 tracking-tight leading-snug">{user.name}</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{user.commission}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="text-[11px] font-medium text-gray-600 hover:text-black bg-[#F3F4F6] hover:bg-[#EAEAEA] active:scale-95 px-3.5 py-1.5 rounded-full transition-all shrink-0 flex items-center space-x-1"
          >
            <LogOut className="h-3 w-3" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-[450px] mx-auto px-6 py-4 space-y-6">
        
        {/* iOS warning banner style alerts */}
        <AnimatePresence>
          {isLibur && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-amber-50/70 border border-amber-100/50 text-amber-900 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
            >
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
              <div className="text-xs leading-normal">
                Hari ini libur: <strong className="font-semibold">{schoolStatus.activeEvent?.kegiatan}</strong>. Check-in ditutup.
              </div>
            </motion.div>
          )}

          {isWFH && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-zinc-50 border border-zinc-100 text-zinc-900 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
            >
              <RefreshCw className="h-4 w-4 text-zinc-800 shrink-0 animate-spin-slow" />
              <div className="text-xs leading-normal font-medium">
                Status WFH Aktif ({schoolStatus.activeEvent?.kegiatan}). GPS bypassed.
              </div>
            </motion.div>
          )}

          {errorBanner && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50/70 border border-red-100 text-red-900 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
            >
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <div className="text-xs font-semibold leading-normal">
                Gagal Absen: {errorBanner}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Success check modal rendering (Apple Design Style Card) */}
        {successRecord && (
          <motion.div 
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#ECECEC] p-6 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          >
            <div className="bg-zinc-50 h-16 w-16 rounded-full flex items-center justify-center border border-black/[0.02]">
              <CheckCircle className="h-8 w-8 text-black" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Absensi Berhasil</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1 font-medium">
                {successRecord.checkType} — {successRecord.status}
              </p>
              <p className="text-xs text-gray-655 mt-2 leading-relaxed">
                Kehadiran Anda dicatat pukul {new Date(successRecord.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Terima kasih, {user.name}.
              </p>
            </div>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={() => setSuccessRecord(null)}
              className="text-xs text-white bg-black hover:bg-neutral-900 px-5 py-2.5 rounded-full font-medium"
            >
              Selesai
            </motion.button>
          </motion.div>
        )}

        {/* PRIMARY CHECK SECTION CONTAINER */}
        {!isLibur && !successRecord && (
          <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
            
            {/* Log mode selector tab (Apple iOS Segmented Control Style) */}
            <div className="flex bg-[#F3F4F6] p-1 rounded-[22px] relative select-none">
              <button
                type="button"
                onClick={() => setCheckType('CHECK_IN')}
                className="flex-grow text-center py-2.5 text-xs font-semibold rounded-[18px] relative z-10 transition-colors"
                style={{ color: checkType === 'CHECK_IN' ? '#ffffff' : '#6B7280' }}
              >
                Datang
                {checkType === 'CHECK_IN' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-black rounded-[18px] -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCheckType('CHECK_OUT')}
                className="flex-grow text-center py-2.5 text-xs font-semibold rounded-[18px] relative z-10 transition-colors"
                style={{ color: checkType === 'CHECK_OUT' ? '#ffffff' : '#6B7280' }}
              >
                Pulang
                {checkType === 'CHECK_OUT' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-black rounded-[18px] -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </div>

            {/* GPS Evaluation metrics presents as clean Apple Setting Rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-gray-900">Validasi GPS Perangkat</span>
                <button 
                  type="button"
                  onClick={triggerGPSLocation}
                  disabled={gpsLoading}
                  className="text-xs text-gray-500 hover:text-black hover:bg-[#F3F4F6] px-2.5 py-1 rounded-full flex items-center space-x-1.5 transition duration-150"
                >
                  <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>{gpsLoading ? 'Memperbarui...' : 'Perbarui GPS'}</span>
                </button>
              </div>

              {locationError ? (
                <div className="bg-red-50/70 border border-red-100 text-red-900 px-4 py-3 rounded-2xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{locationError}</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs text-gray-500 font-medium">Jarak ke Sekolah</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {isWFH ? '0 m (WFH)' : location.distance !== undefined ? `${(location.distance / 1000).toFixed(2)} km` : 'Mengukur...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs text-gray-500 font-medium">Akurasi GPS</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {location.accuracy !== undefined ? `±${Math.round(location.accuracy)} meter` : 'Mengukur...'}
                    </span>
                  </div>
                </div>
              )}

              {/* iOS warning geofence banner */}
              {!isWFH && location.distance !== undefined && (
                <div className="pt-2">
                  {canScan ? (
                    <div className="bg-zinc-50 border border-zinc-100 text-zinc-950 px-4 py-3.5 rounded-2xl text-xs leading-normal flex items-start space-x-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                      <MapPin className="h-4 w-4 text-zinc-900 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-zinc-950">Geofence Valid</p>
                        <p className="text-gray-500 mt-0.5">Anda berada di dalam radius geofence sekolah (50 Meter). Silakan scan QR absensi.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-100 text-amber-900 px-4 py-3.5 rounded-2xl text-xs leading-normal flex items-start space-x-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-950">Di luar Geofence</p>
                        <p className="text-amber-805 mt-0.5">
                          Anda berjarak {location.distance ? Math.round(location.distance - 50) : 0} meter di luar geofence sekolah. Silakan mendekat ke lokasi sekolah.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Premium QR Camera Interface Area */}
            {scanning ? (
              <div className="space-y-4">
                <div className="bg-black rounded-[28px] overflow-hidden aspect-square relative border border-zinc-200">
                  <div id="qr-scanner-element" className="w-full h-full"></div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={stopScanner}
                  className="w-full py-3 bg-[#F3F4F6] hover:bg-neutral-200 text-gray-800 text-xs font-semibold rounded-[18px] transition"
                >
                  Batal Memindai
                </motion.button>
              </div>
            ) : (
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  type="button"
                  onClick={startScanner}
                  disabled={!canScan || loading}
                  className="w-full h-44 rounded-[28px] flex flex-col items-center justify-center space-y-2.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none bg-gradient-to-b from-[#FAFBFD] to-[#F1F3F6] border border-black/[0.02]"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 30px rgba(0,0,0,0.02)'
                  }}
                >
                  <div className="bg-white h-14 w-14 rounded-full flex items-center justify-center shadow-sm border border-black/[0.015]">
                    <Camera className="h-6 w-6 text-black" />
                  </div>
                  <div className="text-center px-4">
                    <span className="block text-sm font-semibold text-gray-900">Pindai QR Absensi</span>
                    <span className="block text-[11px] text-gray-400 mt-1">
                      {canScan ? 'Tekan untuk membuka kamera pemindai' : 'Harus berada di lokasi Al-Wildan BSD'}
                    </span>
                  </div>
                </motion.button>
                
                {(config.systemMode || 'GPS + QR') === 'GPS Only' && canScan && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => submitAttendance()}
                    disabled={loading}
                    className="w-full py-3 bg-[#F3F4F6] hover:bg-neutral-200 text-gray-850 text-xs font-semibold rounded-[18px] transition"
                  >
                    Setorkan Presensi (Tanpa QR)
                  </motion.button>
                )}
              </div>
            )}
          </div>
        )}

        {/* PERSONAL QR CARD (Action Card iOS list style layout) */}
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="bg-[#F3F4F6] h-11 w-11 rounded-full flex items-center justify-center border border-black/[0.02]">
                <QrCode className="h-5 w-5 text-gray-800" />
              </div>
              <div className="text-left animate-fade-in">
                <h4 className="text-xs font-semibold text-gray-900">Kartu QR Personal</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Tampilkan identitas QR Anda</p>
              </div>
            </div>
            <button 
              onClick={() => setShowQRCard(!showQRCard)}
              className="text-xs font-semibold text-black hover:bg-[#F3F4F6] px-4 py-2 rounded-full border border-gray-150 transition-all flex items-center space-x-1"
            >
              <span>{showQRCard ? 'Tutup' : 'Tampilkan'}</span>
            </button>
          </div>

          <AnimatePresence>
            {showQRCard && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-5 p-6 bg-black text-white rounded-[24px] flex flex-col items-center justify-center space-y-5 border border-black/[0.1] shadow-xl relative">
                  <div className="text-center space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-medium">AL-WILDAN BOARDING SCHOOL 3</p>
                    <h5 className="text-xs font-semibold text-white">Kartu Identitas Digital</h5>
                  </div>

                  {/* QR Image Fetch from QRServer - Black and White Pure QR */}
                  <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.qrValue || '')}`}
                      alt="User QR"
                      className="h-36 w-36 object-contain block"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-gray-400 font-mono">@{user.id}</p>
                    <h5 className="text-sm font-semibold">{user.name}</h5>
                    <span className="inline-block text-[10px] bg-white/10 text-white px-3 py-1 rounded-full font-medium">
                      {user.commission}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ATTENDANCE CORRECTIONS (DISPENSATION SUBMISSION FORM like iOS setting) */}
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5">
          <div className="flex items-center space-x-3 pb-2 border-b border-gray-100">
            <div className="bg-[#F3F4F6] h-9 w-9 rounded-full flex items-center justify-center">
              <History className="h-4 w-4 text-gray-700" />
            </div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Koreksi & Dispensasi</h4>
          </div>

          <form onSubmit={handleCorrectionSubmit} className="space-y-4 font-sans">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                Tanggal Terlewat
              </label>
              <input
                type="date"
                required
                value={correctionDate}
                onChange={(e) => setCorrectionDate(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] transition font-sans text-gray-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                Kategori Kendala
              </label>
              <select
                value={correctionType}
                onChange={(e: any) => setCorrectionType(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] transition font-sans text-gray-805 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%2522%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat"
              >
                <option value="LUPA_CHECKIN">Lupa Check In</option>
                <option value="LUPA_CHECKOUT">Lupa Check Out</option>
                <option value="GPS_ERROR">GPS Sinyal Lemah / Error</option>
                <option value="QR_ERROR">Kamera Scanner Error</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                Alasan Detail / Kronologi
              </label>
              <textarea
                required
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Tuliskan kronologi singkat..."
                className="w-full px-4 py-3 text-xs bg-[#F3F4F6] border-none rounded-[18px] focus:outline-none focus:bg-[#EAEAEA] transition font-sans text-gray-800 resize-none placeholder-gray-400"
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submittingCorr}
              className="w-full py-3.5 bg-black text-white text-xs font-semibold rounded-[18px] hover:bg-neutral-900 transition cursor-pointer"
            >
              {submittingCorr ? 'Mengirim...' : 'Kirim Pengajuan'}
            </motion.button>
          </form>

          {/* List of submittals */}
          {corrections.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 block pb-1">Riwayat Pengajuan</span>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {corrections.map((corr) => (
                  <div key={corr.id} className="p-4 bg-[#F8F9FA] rounded-[18px] space-y-2 border border-black/[0.015]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{corr.correctionDate}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                        corr.status === 'PENDING' ? 'bg-amber-50 text-amber-800' :
                        corr.status === 'APPROVED' ? 'bg-zinc-950 text-white' : 'bg-red-50 text-red-800'
                      }`}>
                        {corr.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{corr.type.replace('_',' ')}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-normal">{corr.reason}</p>
                    </div>
                    {corr.approvedBy && (
                      <p className="text-[10px] text-gray-400 italic">Disetujui oleh: {corr.approvedBy}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
