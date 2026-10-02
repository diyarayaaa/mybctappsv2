'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Lock,
  User as UserIcon,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const { user, login, sendOtp, verifyOtp, logout, isLoading: isAuthLoading } = useAuth();

  // Mode: 'credentials' | 'gmail_email' | 'gmail_otp'
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'gmail'>('credentials');
  const [otpStep, setOtpStep] = useState<'input_email' | 'input_code'>('input_email');

  // Credentials State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Gmail OTP State
  const [gmailAddress, setGmailAddress] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-redirect if already logged in and not switching
  useEffect(() => {
    const isSwitching = searchParams.get('switch') === 'true';
    if (user && !isAuthLoading && !isSwitching) {
      const targetUrl = (!redirect || redirect.startsWith('/login')) ? '/' : redirect;
      window.location.href = targetUrl;
    }
  }, [user, isAuthLoading, redirect, searchParams]);

  // Handle Standard Credentials Submit
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan Username akun Anda');
      return;
    }

    if (!password) {
      setErrorMsg('Masukkan kata sandi Anda');
      return;
    }

    setIsLoading(true);
    const res = await login(username.trim(), password, rememberMe);

    if (res.success) {
      const targetUrl = (!redirect || redirect.startsWith('/login')) ? '/' : redirect;
      window.location.href = targetUrl;
    } else {
      setErrorMsg(res.error || 'Login gagal, periksa username dan kata sandi Anda');
      setIsLoading(false);
    }
  };

  // Handle Sending OTP to Gmail
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = gmailAddress.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Silakan masukkan alamat Gmail Anda');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setErrorMsg('Format email tidak valid. Masukkan email yang benar.');
      return;
    }

    setIsLoading(true);
    const res = await sendOtp(clean);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || `Kode verifikasi telah dikirim ke ${clean}`);
      setOtpStep('input_code');
      setCountdown(30); // 30s resend timer
    } else {
      setErrorMsg(res.error || 'Email belum di konfirmasi, hubungi administrator untuk info lebih lanjut.');
    }
  };

  // Handle Verifying OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg('Masukkan 6-digit kode verifikasi dengan lengkap');
      return;
    }

    setIsLoading(true);
    const res = await verifyOtp(gmailAddress.trim().toLowerCase(), cleanCode, rememberMe);

    if (res.success) {
      setSuccessMsg('Verifikasi berhasil! Mengalihkan ke sistem...');
      setTimeout(() => {
        const targetUrl = (!redirect || redirect.startsWith('/login')) ? '/' : redirect;
        window.location.href = targetUrl;
      }, 500);
    } else {
      setErrorMsg(res.error || 'Kode verifikasi tidak sesuai atau sudah kadaluarsa.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500 selection:text-white">
      {/* ========================================================
          LEFT COLUMN: SalesSkip-inspired Electric Royal Blue Banner
          ======================================================== */}
      <div className="relative w-full lg:w-1/2 bg-gradient-to-br from-[#2347ea] via-[#203fdf] to-[#172eb0] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-16 overflow-hidden min-h-[260px] lg:min-h-screen shrink-0">
        {/* Abstract Architectural Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 600"
          preserveAspectRatio="none"
        >
          <path
            d="M -100,80 C 150,20 380,180 550,550"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          <path
            d="M -60,140 C 180,80 410,240 590,620"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M -20,200 C 220,140 450,300 630,690"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M 20,260 C 260,200 490,360 670,760"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <circle cx="500" cy="100" r="280" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
          <circle cx="500" cy="100" r="380" fill="none" stroke="white" strokeWidth="1" opacity="0.1" />
        </svg>

        {/* Top Branding / Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shadow-black/10">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 sm:w-7 sm:h-7 text-white">
                <line x1="50" y1="14" x2="50" y2="86" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                <line x1="14" y1="50" x2="86" y2="50" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                <line x1="24" y1="24" x2="76" y2="76" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                <line x1="24" y1="76" x2="76" y2="24" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-wider text-white uppercase drop-shadow-xs">
              BEST COMPUTEL
            </span>
          </div>

          <div className="lg:hidden">
            <ThemeToggle className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>

        {/* Central Hero Message */}
        <div className="relative z-10 my-auto py-8 sm:py-12 max-w-lg">
          <div className="hidden lg:block mb-8">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white drop-shadow-md">
              <line x1="50" y1="12" x2="50" y2="88" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              <line x1="12" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              <line x1="23" y1="23" x2="77" y2="77" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
              <line x1="23" y1="77" x2="77" y2="23" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Best Computel <br />
            <span className="text-blue-200">RMA & Service</span>
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
            Sistem terintegrasi servis dan garansi. Masuk dengan akun kredensial terdaftar atau gunakan autentikasi kode OTP yang dikirim ke Gmail Anda.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Autentikasi OTP Gmail
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              Admin User Management
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              Keamanan Terverifikasi
            </span>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="relative z-10 pt-4 text-xs text-blue-200/70 font-medium">
          © 2026 Best Computel. All rights reserved.
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Clean Authentication Form
          ======================================================== */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 bg-white dark:bg-slate-900 transition-colors duration-200 overflow-y-auto">
        {/* Top Header inside Form side */}
        <div className="hidden lg:flex items-center justify-between pb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Best Computel
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wider">
              RMA
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Center Form */}
        <div className="w-full max-w-md mx-auto my-auto py-4 space-y-6">
          {/* Welcome Text */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loginMethod === 'credentials'
                ? 'Welcome Back!'
                : otpStep === 'input_email'
                ? 'Login via Gmail OTP'
                : 'Verifikasi Kode OTP'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {loginMethod === 'credentials'
                ? 'Silakan masuk menggunakan username & kata sandi Anda.'
                : otpStep === 'input_email'
                ? 'Masukkan alamat Gmail yang telah didaftarkan oleh Administrator.'
                : `Masukkan 6-digit kode verifikasi yang dikirim ke ${gmailAddress}`}
            </p>
          </div>

          {/* Active Session Warning */}
          {user && (
            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">Sedang login sebagai:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {user.nama_lengkap} ({user.role})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetUrl = (!redirect || redirect.startsWith('/login')) ? '/' : redirect;
                    window.location.href = targetUrl;
                  }}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Ke Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ganti Akun</span>
                </button>
              </div>
            </div>
          )}

          {/* Toggle Login Method Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('credentials');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
                loginMethod === 'credentials'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Username & Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('gmail');
                setOtpStep('input_email');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-2 ${
                loginMethod === 'gmail'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Login Kode Gmail</span>
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* ====================================================
              METHOD 1: STANDARD CREDENTIALS LOGIN
              ==================================================== */}
          {loginMethod === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Username Akun
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-3 focus:ring-blue-500/15 focus:outline-hidden transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-3 focus:ring-blue-500/15 focus:outline-hidden transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Ingat saya di perangkat ini
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#18181b] hover:bg-[#27272a] active:bg-[#09090b] text-white font-bold text-sm rounded-xl shadow-md shadow-black/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="animate-pulse">Memproses Masuk...</span>
                ) : (
                  <>
                    <span>Login Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ====================================================
              METHOD 2: GMAIL OTP LOGIN
              ==================================================== */}
          {loginMethod === 'gmail' && otpStep === 'input_email' && (
            <form onSubmit={handleSendOtpSubmit} className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat Gmail Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={gmailAddress}
                    onChange={(e) => setGmailAddress(e.target.value)}
                    placeholder="nama@gmail.com"
                    autoFocus
                    required
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-3 focus:ring-blue-500/15 focus:outline-hidden transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim Kode ke Gmail...</span>
                  </span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Kirim Kode Verifikasi ke Gmail</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ====================================================
              METHOD 2: GMAIL OTP STEP 2 - ENTER 6-DIGIT CODE
              ==================================================== */}
          {loginMethod === 'gmail' && otpStep === 'input_code' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Email Tujuan</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {gmailAddress}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('input_email');
                    setOtpCode('');
                    setErrorMsg('');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Masukkan 6-Digit Kode Verifikasi
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:ring-3 focus:ring-blue-500/15 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Tidak menerima email?</span>
                {countdown > 0 ? (
                  <span className="text-slate-400 font-medium">Kirim ulang ({countdown}s)</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtpSubmit}
                    disabled={isLoading}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Kirim Ulang Kode
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length < 6}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="animate-pulse">Memverifikasi Kode...</span>
                ) : (
                  <>
                    <span>Verifikasi & Masuk Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Column Bottom Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Best Computel RMA & Service</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
