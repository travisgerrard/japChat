// scripts/get-supabase-token.js
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

async function getSupabaseMagicLink() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key not found in .env.local')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Replace with your test user email
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'travisgerrard@gmail.com',
    })

    if (error) {
      console.error('Error sending magic link:', error.message)
      return
    }

    console.log('Magic link sent to travisgerrard@gmail.com')
    console.log('Please open the link in your email to get the token.')

  } catch (error) {
    console.error('Error:', error)
  }
}

getSupabaseMagicLink()