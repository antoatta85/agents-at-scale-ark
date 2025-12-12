import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { NextRequestWithAuth } from './auth';
import { auth } from './auth';
import { COOKIE_SESSION_TOKEN, SIGNIN_PATH } from './lib/constants/auth';

async function middleware(request: NextRequest) {
  // API routes are handled by app/api/[...path]/route.ts (Node.js runtime)
  // This middleware only handles page requests, not API routes
  // For all requests, continue normally
  return NextResponse.next();
}

export default auth(async (req: NextRequestWithAuth) => {
  //If no user session redirect to signin page
  if (!req.auth) {
    //If the user is trying to access a page other than the signin page, set it as the callback url.
    if (req.nextUrl.pathname !== SIGNIN_PATH) {
      const baseURL = process.env.BASE_URL;

      const newUrl = new URL(
        `${SIGNIN_PATH}?callbackUrl=${encodeURIComponent(baseURL!)}`,
        baseURL,
      );

      return NextResponse.redirect(newUrl);
    }
    return NextResponse.next();
  }

  return middleware(req);
});

export const config = {
  // Exclude all /api routes - they're handled by API routes (Node.js runtime)
  matcher: '/((?!api|signout|_next/static|_next/image|favicon.ico).*)',
};
