'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOtp: (email: string, code: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    try {
      // Validate with API
      const res = await fetch('/api/auth/me');
      const text = await res.text();
      let data: { authenticated?: boolean; user?: User } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // ignore non-json
      }

      if (data.authenticated && data.user) {
        setUser(data.user);
        localStorage.setItem('bct_auth_user', JSON.stringify(data.user));
        localStorage.setItem('bct_current_user', data.user.nama_lengkap);
      } else {
        // Fallback: check localStorage in case cookie was temporarily not read
        const localUserStr = typeof window !== 'undefined' ? localStorage.getItem('bct_auth_user') : null;
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            if (localUser && localUser.id) {
              setUser(localUser);
              if (typeof document !== 'undefined') {
                document.cookie = `bct_auth_user=${encodeURIComponent(localUserStr)}; path=/; max-age=86400; SameSite=Lax`;
              }
              setIsLoading(false);
              return;
            }
          } catch {
            // ignore JSON error
          }
        }

        setUser(null);
        localStorage.removeItem('bct_auth_user');
        localStorage.removeItem('bct_current_user');
        const isPublicPage = pathname === '/login' || pathname?.startsWith('/tracking');
        if (pathname && !isPublicPage) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    } catch (err) {
      console.error('Failed to check auth session:', err);
      // Keep cached user if network glitch on refresh, only redirect if explicitly unauthenticated
      const localUserStr = typeof window !== 'undefined' ? localStorage.getItem('bct_auth_user') : null;
      if (!localUserStr) {
        setUser(null);
        const isPublicPage = pathname === '/login' || pathname?.startsWith('/tracking');
        if (pathname && !isPublicPage) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bct_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setUser(parsed);
        }
      }
    } catch {}

    fetchSession();
  }, [fetchSession]);

  const login = async (username: string, password: string, rememberMe = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string; user?: User } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return { success: false, error: text ? text.slice(0, 200) : `Server error ${res.status}` };
      }

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Login gagal (${res.status})` };
      }

      setUser(data.user!);
      localStorage.setItem('bct_auth_user', JSON.stringify(data.user));
      localStorage.setItem('bct_current_user', data.user!.nama_lengkap);

      if (typeof document !== 'undefined') {
        const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
        document.cookie = `bct_auth_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const sendOtp = async (email: string) => {
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string; message?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return { success: false, error: text ? text.slice(0, 200) : `Server error ${res.status}` };
      }

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Gagal mengirim kode (${res.status})` };
      }

      return {
        success: true,
        message: data.message
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const verifyOtp = async (email: string, code: string, rememberMe = true) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, rememberMe })
      });

      const text = await res.text();
      let data: { success?: boolean; error?: string; user?: User } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return { success: false, error: text ? text.slice(0, 200) : `Server error ${res.status}` };
      }

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Verifikasi gagal (${res.status})` };
      }

      setUser(data.user!);
      localStorage.setItem('bct_auth_user', JSON.stringify(data.user));
      localStorage.setItem('bct_current_user', data.user!.nama_lengkap);

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const refreshUser = async () => {
    await fetchSession();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'bct_auth_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      setUser(null);
      localStorage.removeItem('bct_auth_user');
      localStorage.removeItem('bct_current_user');
      window.location.href = '/login?switch=true';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        sendOtp,
        verifyOtp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

