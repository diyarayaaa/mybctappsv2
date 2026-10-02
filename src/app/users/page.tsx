'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Modal } from '@/components/ui/Modal';
import { User, UserRole, UserStatus } from '@/types';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  Key,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldAlert,
  Sparkles,
  Clock,
  ArrowUpDown,
  Lock,
  Check,
  AlertCircle
} from 'lucide-react';

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
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

export default function UserManagementPage() {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEKNISI');
  const [newStatus, setNewStatus] = useState<UserStatus>('active');
  const [newSpesialisasi, setNewSpesialisasi] = useState('');
  const [newPassword, setNewPassword] = useState('bct123');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('TEKNISI');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editSpesialisasi, setEditSpesialisasi] = useState('');

  const [newResetPassword, setNewResetPassword] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // SMTP Settings State
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<{ configured: boolean; email: string | null }>({ configured: false, email: null });
  const [smtpEmailInput, setSmtpEmailInput] = useState('');
  const [smtpPasswordInput, setSmtpPasswordInput] = useState('');
  const [isSmtpLoading, setIsSmtpLoading] = useState(false);

  // Auto hide toast
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Gagal memuat data pengguna');
      } else {
        setUsers(data.users || []);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch SMTP status
  const fetchSmtpConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/smtp');
      const data = await res.json();
      if (data.success) {
        setSmtpConfig({ configured: data.configured, email: data.email });
        if (data.email) setSmtpEmailInput(data.email);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
      fetchSmtpConfig();
    }
  }, [currentUser, fetchUsers, fetchSmtpConfig]);

  // Handle Save SMTP
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSmtpLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: smtpEmailInput, app_password: smtpPasswordInput })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.error || 'Gagal menyimpan pengaturan SMTP';
        setModalError(msg);
      } else {
        setModalError(null);
        setToastMsg({ type: 'success', text: data.message || 'Akun Gmail pengirim berhasil disimpan!' });
        setIsSmtpModalOpen(false);
        setSmtpPasswordInput('');
        fetchSmtpConfig();
      }
    } catch {
      const msg = 'Gagal terhubung ke server';
      setModalError(msg);
    } finally {
      setIsSmtpLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        u.nama_lengkap.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.spesialisasi && u.spesialisasi.toLowerCase().includes(q));

      // Role
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;

      // Status
      const matchStatus = statusFilter === 'ALL' || (u.status || 'active') === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.role === 'ADMIN').length;
    const teknisiCount = users.filter((u) => u.role === 'TEKNISI').length;
    const pendingCount = users.filter((u) => u.status === 'pending').length;
    const googleCount = users.filter((u) => u.provider === 'google' || (u.email && u.email.includes('@gmail.com'))).length;
    return { total, adminCount, teknisiCount, pendingCount, googleCount };
  }, [users]);

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setModalError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          nama_lengkap: newName,
          email: newEmail || null,
          role: newRole,
          status: newStatus,
          spesialisasi: newSpesialisasi || null,
          password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.error || 'Gagal menambahkan pengguna';
        setModalError(msg);
      } else {
        setModalError(null);
        setToastMsg({ type: 'success', text: `Pengguna ${newName} berhasil ditambahkan!` });
        setIsAddModalOpen(false);
        // Reset form
        setNewUsername('');
        setNewName('');
        setNewEmail('');
        setNewPassword('bct123');
        setNewSpesialisasi('');
        fetchUsers();
      }
    } catch {
      const msg = 'Gagal menghubungi server';
      setModalError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: User) => {
    setModalError(null);
    setEditUser(u);
    setEditName(u.nama_lengkap);
    setEditEmail(u.email || '');
    setEditRole(u.role);
    setEditStatus(u.status || 'active');
    setEditSpesialisasi(u.spesialisasi || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setIsActionLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_lengkap: editName,
          email: editEmail || null,
          role: editRole,
          status: editStatus,
          spesialisasi: editSpesialisasi || null
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.error || 'Gagal memperbarui pengguna';
        setModalError(msg);
      } else {
        setModalError(null);
        setToastMsg({ type: 'success', text: `Data ${editName} berhasil diperbarui!` });
        setEditUser(null);
        fetchUsers();
      }
    } catch {
      const msg = 'Gagal menghubungi server';
      setModalError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick Change Status (Approve / Activate / Suspend)
  const handleQuickStatusChange = async (targetUser: User, nextStatus: UserStatus) => {
    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToastMsg({ type: 'error', text: data.error || 'Gagal mengubah status' });
      } else {
        const actionLabel = nextStatus === 'active' ? 'diaktifkan / disetujui' : 'dinonaktifkan';
        setToastMsg({ type: 'success', text: `Akun ${targetUser.nama_lengkap} berhasil ${actionLabel}!` });
        fetchUsers();
      }
    } catch {
      setToastMsg({ type: 'error', text: 'Gagal menghubungi server' });
    }
  };

  // Quick Change Role
  const handleQuickRoleChange = async (targetUser: User, nextRole: UserRole) => {
    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToastMsg({ type: 'error', text: data.error || 'Gagal mengubah role' });
      } else {
        setToastMsg({ type: 'success', text: `Role ${targetUser.nama_lengkap} diubah menjadi ${nextRole}!` });
        fetchUsers();
      }
    } catch {
      setToastMsg({ type: 'error', text: 'Gagal menghubungi server' });
    }
  };

  // Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser || !newResetPassword.trim()) return;
    setIsActionLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/users/${resetPwdUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.error || 'Gagal mereset kata sandi';
        setModalError(msg);
      } else {
        setModalError(null);
        setToastMsg({ type: 'success', text: `Kata sandi ${resetPwdUser.nama_lengkap} berhasil diubah!` });
        setResetPwdUser(null);
        setNewResetPassword('');
      }
    } catch {
      const msg = 'Gagal menghubungi server';
      setModalError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete User Submit
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setIsActionLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/users/${deleteTargetUser.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalError(data.error || 'Gagal menghapus pengguna');
      } else {
        setModalError(null);
        setToastMsg({ type: 'success', text: `Pengguna ${deleteTargetUser.nama_lengkap} berhasil dihapus.` });
        setDeleteTargetUser(null);
        fetchUsers();
      }
    } catch {
      setModalError('Gagal menghubungi server');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Access check: Only Admin
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Memverifikasi hak akses Admin...</span>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Akses Ditolak: Khusus Administrator
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Halaman Manajemen Pengguna ini hanya dapat diakses oleh akun dengan Role <strong>ADMIN</strong>.
            Akun Anda saat ini (<strong>{currentUser?.nama_lengkap || 'Pengguna'}</strong>) memiliki hak akses <strong>{currentUser?.role || 'User'}</strong>.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border ${
              toastMsg.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40'
            }`}
          >
            {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Manajemen Pengguna & Role
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setModalError(null);
              setIsSmtpModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Konfigurasi Akun Gmail Pengirim OTP"
          >
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Pengirim Gmail (SMTP)</span>
            {smtpConfig.configured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="SMTP Aktif" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Belum Dikonfigurasi" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setModalError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Terdaftar di sistem</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Role Admin</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.adminCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Memiliki akses penuh</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Role Teknisi</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.teknisiCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pengerjaan tiket servis</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <GoogleIcon className="w-3.5 h-3.5" />
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Login Gmail</p>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.googleCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Terkoneksi Google OAuth</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Menunggu Approval</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendingCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Perlu persetujuan admin</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, username..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Role:</span>
            {(['ALL', 'ADMIN', 'TEKNISI', 'SALES', 'VIEWER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                  roleFilter === r
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {r === 'ALL' ? 'Semua' : r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Status:</span>
            {(['ALL', 'active', 'pending', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'Semua' : s === 'active' ? 'Aktif' : s === 'pending' ? 'Pending' : 'Nonaktif'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Pengguna</th>
                <th className="py-3.5 px-4">Metode Login</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Terdaftar / Login</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>Tidak ada pengguna yang cocok dengan kriteria pencarian.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isGoogleUser = u.provider === 'google' || (u.email && u.email.endsWith('@gmail.com'));
                  const userStatus = u.status || 'active';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs ${
                              u.avatar_color === 'orange'
                                ? 'bg-orange-500'
                                : u.avatar_color === 'purple'
                                ? 'bg-purple-600'
                                : u.avatar_color === 'emerald'
                                ? 'bg-emerald-600'
                                : u.avatar_color === 'rose'
                                ? 'bg-rose-500'
                                : u.avatar_color === 'indigo'
                                ? 'bg-indigo-600'
                                : 'bg-blue-600'
                            }`}
                          >
                            {(u.nama_lengkap.slice(0, 2) || 'US').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {u.nama_lengkap}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>@{u.username}</span>
                              {u.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{u.email}</span>
                                </>
                              )}
                            </div>
                            {u.spesialisasi && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {u.spesialisasi}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Login Provider */}
                      <td className="py-3.5 px-4">
                        {isGoogleUser ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <GoogleIcon className="w-3.5 h-3.5" />
                            <span>Google / Gmail</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-500">
                            <Lock className="w-3 h-3" />
                            <span>Password</span>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleQuickRoleChange(u, e.target.value as UserRole)}
                          disabled={isCurrent}
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                              : u.role === 'TEKNISI'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                              : u.role === 'SALES'
                              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="TEKNISI">TEKNISI</option>
                          <option value="SALES">SALES</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              userStatus === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : userStatus === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                userStatus === 'active'
                                  ? 'bg-emerald-500'
                                  : userStatus === 'pending'
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span>
                              {userStatus === 'active'
                                ? 'Aktif'
                                : userStatus === 'pending'
                                ? 'Menunggu Approval'
                                : 'Nonaktif'}
                            </span>
                          </span>

                          {/* Quick Approve button if pending */}
                          {userStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(u, 'active')}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="Setujui Akun Langsung"
                            >
                              Setujui
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Registered & Last Login */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{u.last_login ? `Login: ${u.last_login.split(' ')[0]}` : 'Belum pernah login'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Daftar: {u.created_at ? u.created_at.split(' ')[0] : '-'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Status */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickStatusChange(u, userStatus === 'active' ? 'suspended' : 'active')
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                userStatus === 'active'
                                  ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={userStatus === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            >
                              {userStatus === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Pengguna"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setModalError(null);
                              setResetPwdUser(u);
                              setNewResetPassword('');
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: Tambah Pengguna Baru
          ======================================================== */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Pengguna Baru"
          subtitle="Buat akun baru untuk teknisi, kasir, atau admin"
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Ahmad Teknisi"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="username"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email / Gmail (Untuk Login OTP)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Digunakan untuk menerima kode verifikasi OTP saat login Gmail.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Akses <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="TEKNISI">TEKNISI (Pengerjaan Servis)</option>
                  <option value="ADMIN">ADMIN (Hak Akses Penuh)</option>
                  <option value="SALES">SALES (Stok Toko & Garansi)</option>
                  <option value="VIEWER">VIEWER (Hanya Lihat)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="active">Aktif Langsung</option>
                  <option value="pending">Pending Approval</option>
                  <option value="suspended">Nonaktif (Suspended)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Awal <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="bct123"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Spesialisasi / Keterangan (Opsional)
              </label>
              <input
                type="text"
                value={newSpesialisasi}
                onChange={(e) => setNewSpesialisasi(e.target.value)}
                placeholder="Contoh: Teknisi Hardware Laptop & Garansi"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                {isActionLoading ? 'Menyimpan...' : 'Simpan Pengguna'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: Edit Pengguna
          ======================================================== */}
      {editUser && (
        <Modal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Edit Pengguna: ${editUser.nama_lengkap}`}
          subtitle={`Ubah role dan informasi akun @${editUser.username}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email / Gmail (Untuk Login OTP)
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="nama@gmail.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Akun ini dapat login menggunakan kode verifikasi OTP yang dikirim ke Gmail ini.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Akses
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={currentUser?.id === editUser.id}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden cursor-pointer disabled:opacity-60"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="TEKNISI">TEKNISI</option>
                  <option value="SALES">SALES</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status Akun
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  disabled={currentUser?.id === editUser.id}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden cursor-pointer disabled:opacity-60"
                >
                  <option value="active">Aktif</option>
                  <option value="pending">Menunggu Approval</option>
                  <option value="suspended">Nonaktif (Suspended)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Spesialisasi / Deskripsi
              </label>
              <input
                type="text"
                value={editSpesialisasi}
                onChange={(e) => setEditSpesialisasi(e.target.value)}
                placeholder="Contoh: Teknisi Servis Reguler"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                {isActionLoading ? 'Menyimpan...' : 'Perbarui Pengguna'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: Reset Kata Sandi
          ======================================================== */}
      {resetPwdUser && (
        <Modal
          isOpen={!!resetPwdUser}
          onClose={() => setResetPwdUser(null)}
          title={`Reset Kata Sandi: ${resetPwdUser.nama_lengkap}`}
          subtitle={`Set kata sandi baru untuk akun @${resetPwdUser.username}`}
          maxWidth="sm"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  required
                  autoFocus
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Beritahukan kata sandi baru ini kepada pengguna setelah diubah.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResetPwdUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isActionLoading || !newResetPassword.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
              >
                {isActionLoading ? 'Memproses...' : 'Ubah Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: Konfirmasi Hapus Pengguna
          ======================================================== */}
      {deleteTargetUser && (
        <Modal
          isOpen={!!deleteTargetUser}
          onClose={() => setDeleteTargetUser(null)}
          title="Konfirmasi Hapus Pengguna"
          subtitle={`Apakah Anda yakin ingin menghapus akun ${deleteTargetUser.nama_lengkap}?`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                Tindakan ini akan menghapus akun <strong>@{deleteTargetUser.username}</strong> secara permanen dari sistem. Pengguna ini tidak akan dapat login kembali.
              </div>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isActionLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-500/20"
              >
                {isActionLoading ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL: Konfigurasi Akun Gmail Pengirim (SMTP)
          ======================================================== */}
      {isSmtpModalOpen && (
        <Modal
          isOpen={isSmtpModalOpen}
          onClose={() => setIsSmtpModalOpen(false)}
          title="Konfigurasi Akun Gmail Pengirim (SMTP OTP)"
          subtitle="Atur akun Gmail yang mengirim kode verifikasi 6-digit ke pengguna"
          maxWidth="md"
        >
          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-blue-900 dark:text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Panduan Membuat Sandi Aplikasi Google:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                <li>Buka akun Google Anda di menu <strong>Keamanan</strong> (atau buka <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-semibold">myaccount.google.com/apppasswords</a>).</li>
                <li>Pastikan <strong>Verifikasi 2 Langkah</strong> telah aktif di akun Google Anda.</li>
                <li>Pilih <strong>Sandi Aplikasi</strong>, beri nama misalnya <em>"BCT Service"</em>, lalu buat sandi.</li>
                <li>Salin 16 karakter sandi yang muncul (contoh: <code>abcd efgh ijkl mnop</code>) dan tempel di bawah.</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Gmail Pengirim <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={smtpEmailInput}
                  onChange={(e) => setSmtpEmailInput(e.target.value)}
                  placeholder="contoh: bctservice.notif@gmail.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sandi Aplikasi Google (16 Karakter App Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={smtpPasswordInput}
                  onChange={(e) => setSmtpPasswordInput(e.target.value)}
                  placeholder="16 karakter sandi aplikasi"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-600 focus:outline-hidden font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Sandi ini dienkripsi dan hanya digunakan server untuk mengirim email kode OTP ke pengguna.
              </p>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSmtpModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSmtpLoading || !smtpEmailInput.trim() || !smtpPasswordInput.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSmtpLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memverifikasi Koneksi SMTP...</span>
                  </>
                ) : (
                  <span>Verifikasi & Simpan</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
