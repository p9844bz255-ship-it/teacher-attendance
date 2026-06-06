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
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FFFFFF] text-[#111111] antialiased select-none font-sans"
      style={{ backgroundImage: 'radial-gradient(circle at top, rgba(0,0,0,0.03), transparent 60%)' }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Logo and Header Block */}
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.img 
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png" 
            alt="Al-Wildan Logo" 
            className="h-[72px] w-[72px] object-contain mb-5 filter contrast-125 select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              STAS Portal
            </h1>
            <p className="text-[11px] font-mono tracking-widest uppercase text-gray-400 mt-1.5">
              Al-Wildan Boarding School 3
            </p>
          </motion.div>
        </div>

        {/* Clean Apple/Stripe-styled Card Container */}
        <div className="bg-[#FFFFFF] border border-[#ECECEC] rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.012)] relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start gap-2.5 font-medium leading-relaxed leading-5"
              >
                <div className="h-1.5 w-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!mustChange ? (
            <form onSubmit={handleInitialLogin} className="space-y-5">
              {/* ID Guru Field (stagger Delay: 0.25s) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
              >
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  ID Guru
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Shield className="h-4 w-4 stroke-[1.5]" />
                  </span>
                  <input
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Contoh: alwildan3"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F9F9F9] hover:bg-[#F5F5F5] focus:bg-white border border-[#EBEBEB] focus:border-[#B5B5B5] rounded-xl outline-none transition duration-150 ease-in-out font-sans placeholder-gray-400 text-[#111111] font-medium"
                  />
                </div>
              </motion.div>

              {/* Password Field (stagger Delay: 0.35s) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
              >
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Key className="h-4 w-4 stroke-[1.5]" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-[#F9F9F9] hover:bg-[#F5F5F5] focus:bg-white border border-[#EBEBEB] focus:border-[#B5B5B5] rounded-xl outline-none transition duration-150 ease-in-out font-sans placeholder-gray-400 text-[#111111] font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-450 hover:text-gray-750 outline-none transition duration-100"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 stroke-[1.5]" /> : <Eye className="h-4 w-4 stroke-[1.5]" />}
                  </button>
                </div>
              </motion.div>

              {/* Login Button (stagger Delay: 0.45s) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
              >
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-2.5 bg-[#000000] text-white text-xs uppercase tracking-widest font-mono font-medium rounded-xl hover:bg-[#1E1E1E] transition duration-150 disabled:bg-gray-400 cursor-pointer flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menghubungkan...</span>
                    </>
                  ) : (
                    <span>Masuk Ke Sistem</span>
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
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4 text-xs text-amber-805 leading-relaxed font-sans">
                <p className="font-semibold text-amber-900 mb-1 block">Aktivasi Akun Pertama Kali</p>
                Anda terdeteksi masuk menggunakan sandi bawaan. Demi standar keamanan, Anda wajib mengganti kata sandi sekarang.
              </div>

              {changeSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-black mb-3 animate-bounce stroke-[1.5]" />
                  <p className="text-sm font-bold text-[#111111]">Kata Sandi Diperbarui</p>
                  <p className="text-xs text-gray-400 mt-1.5">Mengonfigurasi halaman utama Anda...</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Password Baru */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                  >
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-450 mb-1.5 font-medium">
                      Kata Sandi Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#F9F9F9] hover:bg-[#F5F5F5] focus:bg-white border border-[#EBEBEB] focus:border-[#B5B5B5] rounded-xl outline-none transition duration-150 text-[#111111] font-medium"
                    />
                  </motion.div>

                  {/* Konfirmasi Password Baru */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                  >
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-450 mb-1.5 font-medium">
                      Konfirmasi Sandi Baru
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi baru"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#F9F9F9] hover:bg-[#F5F5F5] focus:bg-white border border-[#EBEBEB] focus:border-[#B5B5B5] rounded-xl outline-none transition duration-150 text-[#111111] font-medium"
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
                      className="w-full mt-4 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-mono font-medium rounded-xl hover:bg-[#1E1E1E] transition duration-150 disabled:bg-gray-400 cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        <p className="text-center text-[10px] text-gray-400 mt-8 font-mono tracking-wide">
          STAS Enterprise v1.2 • Al-Wildan Boarding School 3
        </p>
      </motion.div>
    </div>
  );
}
