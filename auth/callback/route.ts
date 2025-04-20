import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies() // Get the cookie store instance
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return cookieStore.get(name)?.value
          },
          async set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              console.error(`Failed to set cookie "${name}":`, error)
            }
          },
          async remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options })
            } catch (error) {
              console.error(`Failed to remove cookie "${name}":`, error)
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Supabase code exchange error:', error.message)
    }
  } else {
    console.error('Authentication callback error: No code parameter found.')
  }

  // Redirect to login page on error
  const loginUrl = new URL(`${origin}/login`)
  loginUrl.searchParams.set('error', 'auth_failed')
  loginUrl.searchParams.set('message', 'Could not authenticate user.')
  return NextResponse.redirect(loginUrl.toString())
}