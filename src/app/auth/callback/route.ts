import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next is the intended destination
  const next = searchParams.get('next') ?? '/profile'

  // Ensure 'next' is a relative path to prevent Open Redirects
  const safeNext = next.startsWith('/') ? next : `/${next}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`)
    } else {
      console.error("[AUTH_CALLBACK] exchangeCodeForSession failed:", error)
    }
  }

  // Return to login on error or missing code
  return NextResponse.redirect(`${origin}/login?error=Invalid_Auth_Link`)
}
