import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Function specifically for getting user data in Server Components
export async function getUser() {
    const cookieStore = cookies()

    // Create a server-side client instance directly inside the function
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    // @ts-expect-error - Suppressing persistent type error
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        // @ts-expect-error - Suppressing persistent type error
                        cookieStore.set({ name, value, ...options })
                    } catch { // Remove unused variable
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        // @ts-expect-error - Suppressing persistent type error
                        cookieStore.set({ name, value: '', ...options })
                    } catch { // Remove unused variable
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
            },
        }
    )

    // Now fetch the user
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}