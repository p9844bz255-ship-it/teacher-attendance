import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forced password change state
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);

  const handleInitialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) {
      setError('ID Guru dan sandi wajib diisi.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan sistem.');
      }

      // Check if user is forced to change password
      if (data.user.mustChangePassword) {
        setTempToken(data.token);
        setTempUser(data.user);
        setMustChange(true);
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('Kata sandi baru minimal berukuran 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengganti kata sandi.');
      }

      setChangeSuccess(true);
      setTimeout(() => {
        const completedUser = { ...tempUser, mustChangePassword: false };
        onLoginSuccess(tempToken, completedUser);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 text-[#111111] antialiased select-none font-sans"
      style={{ backgroundImage: 'radial-gradient(circle at top, rgba(0,0,0,0.025), transparent 70%)' }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[430px]"
      >
        {/* Logo and Header Block */}
        <div className="flex flex-col items-center mb-9 text-center">
          <motion.img 
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
            alt="Al-Wildan Logo" 
            className="h-[80px] w-[80px] object-contain mb-5 select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-1.5"
          >
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 font-sans">
              Teacher Attendance
            </h1>
            <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
              AL - WILDAN ISLAMIC SCHOOL 3 BSD CITY
            </p>
          </motion.div>
        </div>

        {/* Clean Premium Glassmorphic Card Container with Radius 28px */}
        <div className="bg-white/90 backdrop-blur-md border border-zinc-100/80 rounded-[28px] p-8 md:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.035)] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-[20px] flex items-start gap-2.5 font-semibold leading-relaxed"
              >
                <div className="h-1.5 w-1.5 bg-rose-500 rounded-full mt-1.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!mustChange ? (
            <form onSubmit={handleInitialLogin} className="space-y-5">
              {/* ID Guru Field with Radius 20px */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  ID Guru
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                    <Shield className="h-4 w-4 stroke-[1.5]" />
                  </span>
                  <input
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Contoh: alwildan3"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-100 rounded-[20px] focus:ring-2 focus:ring-black outline-none transition duration-150 ease-in-out font-sans placeholder-zinc-400 text-zinc-950 font-semibold"
                  />
                </div>
              </motion.div>

              {/* Password Field with Radius 20px */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              >
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400">
                    <Key className="h-4 w-4 stroke-[1.5]" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 text-sm bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-100 rounded-[20px] focus:ring-2 focus:ring-black outline-none transition duration-150 ease-in-out font-sans placeholder-zinc-400 text-zinc-950 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-650 outline-none transition duration-100 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 stroke-[1.5]" /> : <Eye className="h-4 w-4 stroke-[1.5]" />}
                  </button>
                </div>
              </motion.div>

              {/* Login Button with Radius 18px */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
              >
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold rounded-[18px] hover:bg-zinc-900 transition duration-150 disabled:bg-zinc-300 cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menghubungkan...</span>
                    </>
                  ) : (
                    <span>Masuk</span>
                  )}
                </motion.button>
              </motion.div>
            </form>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-[20px] mb-4 text-xs text-amber-805 leading-relaxed font-sans font-semibold">
                <p className="font-bold text-amber-900 mb-1 block">Aktivasi Akun Pertama Kali</p>
                Anda terdeteksi masuk menggunakan sandi bawaan. Demi standar keamanan, Anda wajib mengganti kata sandi sekarang.
              </div>

              {changeSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-black mb-3 animate-bounce stroke-[1.5]" />
                  <p className="text-sm font-bold text-zinc-900">Kata Sandi Diperbarui</p>
                  <p className="text-xs text-zinc-400 mt-1.5 font-medium">Lanjut masuk ke halaman utama...</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Password Baru */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  >
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-4 py-3 text-sm bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-100 rounded-[20px] focus:ring-2 focus:ring-black outline-none transition duration-150 text-zinc-950 font-semibold"
                    />
                  </motion.div>

                  {/* Konfirmasi Password Baru */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                  >
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Konfirmasi Sandi Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi baru"
                      className="w-full px-4 py-3 text-sm bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-100 rounded-[20px] focus:ring-2 focus:ring-black outline-none transition duration-150 text-zinc-950 font-semibold"
                    />
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  >
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      type="submit"
                      disabled={loading}
                      className="w-full mt-4 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold rounded-[18px] hover:bg-zinc-900 transition duration-150 disabled:bg-zinc-300 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <span>Simpan & Masuk</span>
                      )}
                    </motion.button>
                  </motion.div>
                </form>
              )}
            </motion.div>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-400 mt-8 font-semibold uppercase tracking-wider whitespace-nowrap">
          Teacher Attendance • AL-WILDAN BOARDING SCHOOL 3
        </p>
      </motion.div>
    </div>
  );
}
