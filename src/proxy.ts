import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return handleI18nRouting(request)
  }

  let supabaseResponse = handleI18nRouting(request)

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        // Instead of overriding supabaseResponse entirely, we just mutate its cookies
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes, but account for locale prefix!
  const protectedRoutes = ['/profile', '/messages', '/favorites', '/my-listings', '/settings', '/ru/profile', '/ky/profile', '/ru/messages', '/ky/messages', '/ru/favorites', '/ky/favorites', '/ru/my-listings', '/ky/my-listings', '/ru/settings', '/ky/settings']
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`))

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    const locale = request.nextUrl.pathname.startsWith('/ky') ? '/ky' : '/ru';
    url.pathname = `${locale}/login`
    url.searchParams.set('redirect_to', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/(ru|ky)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
