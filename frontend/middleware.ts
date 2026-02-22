import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    // ──────────────────────────────────────────────
    // Unauthenticated: block dashboard & onboarding
    // ──────────────────────────────────────────────
    if (!user) {
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/login'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // ──────────────────────────────────────────────
    // Authenticated: redirect away from auth pages
    // ──────────────────────────────────────────────
    if (pathname.startsWith('/auth')) {
        const onboarded = user.user_metadata?.onboarded === true
        const url = request.nextUrl.clone()
        url.pathname = onboarded ? '/dashboard' : '/onboarding'
        return NextResponse.redirect(url)
    }

    // ──────────────────────────────────────────────
    // Authenticated but not onboarded → force onboarding
    // (except if already on /onboarding)
    // ──────────────────────────────────────────────
    const onboarded = user.user_metadata?.onboarded === true
    if (!onboarded && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
