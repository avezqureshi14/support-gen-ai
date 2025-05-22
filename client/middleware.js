import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode('test');

export async function middleware(req) {
  const token = req.cookies.get('token')?.value;
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const protectedRoutes = ['/'];

  const isProtected = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtected) {
    if (!token) {
      url.pathname = 'auth/login';
      return NextResponse.redirect(url);
    }

    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (err) {
      url.pathname = 'auth/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
