'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  isSidebarPinned: boolean;
  setIsSidebarPinned: (pinned: boolean) => void;
  toggleSidebarPin: () => void;
  // Legacy aliases
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapse: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinnedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = (localStorage.getItem('bct_theme') as Theme) || 'system';
      setThemeState(savedTheme);

      const savedPinned = localStorage.getItem('bct_sidebar_pinned') === 'true';
      setIsSidebarPinnedState(savedPinned);
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let isDark = false;
      if (theme === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = theme === 'dark';
      }

      setResolvedTheme(isDark ? 'dark' : 'light');

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Update meta theme-color for PWA title bar and browser chrome
      const themeColor = isDark ? '#0f172a' : '#ffffff';
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags.length > 0) {
        metaTags.forEach((tag) => {
          tag.removeAttribute('media');
          tag.setAttribute('content', themeColor);
        });
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', themeColor);
        document.head.appendChild(meta);
      }
    };

    updateTheme();

    const handler = () => {
      if (theme === 'system') updateTheme();
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('bct_theme', newTheme);
    } catch {}
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((prev) => !prev);
  }, []);

  const setIsSidebarPinned = useCallback((pinned: boolean) => {
    setIsSidebarPinnedState(pinned);
    try {
      localStorage.setItem('bct_sidebar_pinned', String(pinned));
    } catch {}
  }, []);

  const toggleSidebarPin = useCallback(() => {
    setIsSidebarPinnedState((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('bct_sidebar_pinned', String(nextVal));
      } catch {}
      return nextVal;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        isSidebarPinned,
        setIsSidebarPinned,
        toggleSidebarPin,
        isSidebarCollapsed: !isSidebarPinned,
        setIsSidebarCollapsed: (c) => setIsSidebarPinned(!c),
        toggleSidebarCollapse: toggleSidebarPin
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
