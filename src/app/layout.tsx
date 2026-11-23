import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Roboto } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AppConfigProvider } from '@/components/config/AppConfigProvider';
import { AppLayout } from '@/components/layout/AppLayout';

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Best Computel Service & RMA Management',
  description: 'Aplikasi Web Fullstack Manajemen Servis, Garansi, Surat Jalan & WhatsApp Automation (White-Label Ready)',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full ${roboto.variable}`} suppressHydrationWarning>
      <body className={`h-full ${roboto.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var saved = localStorage.getItem('bct_theme') || 'system';
                var isDark = saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                var color = isDark ? '#0f172a' : '#ffffff';
                var meta = document.querySelector('meta[name="theme-color"]');
                if (meta) {
                  meta.setAttribute('content', color);
                }
              } catch(e) {}
            })();
          `}
        </Script>
        <ThemeProvider>
          <AuthProvider>
            <AppConfigProvider>
              <AppLayout>{children}</AppLayout>
            </AppConfigProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
