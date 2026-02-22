// app/auth/callback/route.ts
// Handles the OAuth redirect from Supabase (Google)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Check if user has completed onboarding (has a profile row in DB)
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                // We'll check the public.profiles table later; for now always check
                // If user metadata has onboarded flag → send to dashboard
                const onboarded = user.user_metadata?.onboarded === true
                const redirectTo = onboarded ? '/dashboard' : '/onboarding'
                return NextResponse.redirect(`${origin}${redirectTo}`)
            }
        }
    }

    // Something went wrong, send to login with error
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
}
