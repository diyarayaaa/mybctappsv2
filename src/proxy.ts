import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static files, Next.js internals, and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/tracking') ||
    pathname.startsWith('/tracking') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo.png') ||
    pathname.startsWith('/manifest') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|woff|woff2|ttf|eot|webmanifest|json|pdf|xlsx|csv)$/)
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('bct_auth_user');
  const isAuthenticated = Boolean(authCookie?.value);

  // 2. Allow /login to always be accessible (allows switching accounts or direct login)
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 3. If NOT logged in and visiting any protected page or API (except auth API), redirect to /login
  if (!isAuthenticated) {
    // For API routes, return 401 unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
