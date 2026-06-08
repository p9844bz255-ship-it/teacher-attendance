import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LoginScreen from './components/LoginScreen';
import GuruDashboard from './components/GuruDashboard';
import AdminDashboard from './components/AdminDashboard';
import KepsekDashboard from './components/KepsekDashboard';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    // Read cached token
    const storedToken = localStorage.getItem('stas_token');
    if (storedToken) {
      validateToken(storedToken);
    } else {
      setInitializing(false);
    }
  }, []);

  const validateToken = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) {
        throw new Error('Sesi kehadiran kadaluarsa. Silakan masuk kembali.');
      }

      const userData = await res.json();
      setToken(authToken);
      setUser(userData);
    } catch (err: any) {
      localStorage.removeItem('stas_token');
      setSessionError(err.message);
    } finally {
      setInitializing(false);
    }
  };

  const handleLoginSuccess = (newToken: string, loggedInUser: any) => {
    localStorage.setItem('stas_token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    setSessionError(null);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error('Logout error clearing server QR state:', e);
      }
    }
    localStorage.removeItem('stas_token');
    setToken(null);
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-[#111111] antialiased">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="h-8 w-8 border-2 border-black border-t-transparent rounded-full"
        />
        <p className="text-[10px] font-mono tracking-widest uppercase text-gray-400 mt-4">
          Attendance Security Verifier...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#FFFFFF] antialiased">
      {sessionError && (
        <div className="bg-black text-white px-4 py-2 text-center text-xs font-mono tracking-wide flex items-center justify-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-white" />
          <span>{sessionError}</span>
          <button 
            onClick={() => setSessionError(null)} 
            className="underline font-bold ml-2 outline-none uppercase"
          >
            TUTUP
          </button>
        </div>
      )}

      {/* Main layout animation */}
      <AnimatePresence mode="wait">
        {!token ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <motion.div
            key={user.role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {user.role === 'GURU' && (
              <GuruDashboard user={user} token={token} onLogout={handleLogout} />
            )}
            
            {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
              <AdminDashboard user={user} token={token} onLogout={handleLogout} />
            )}

            {user.role === 'KEPALA_SEKOLAH' && (
              <KepsekDashboard user={user} token={token} onLogout={handleLogout} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
