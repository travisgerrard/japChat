'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
        } else {
          setUser(session.user);
          // Ensure user exists in custom users table
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();
            if (!existingUser) {
              const { error: insertError } = await supabase
                .from('users')
                .insert({ id: session.user.id, email: session.user.email });
              if (insertError) {
                setError('[users] Error inserting user into custom users table: ' + insertError.message);
              }
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError('[users] Error checking/inserting user into custom users table: ' + message);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError('Error checking user session: ' + message);
      }
      setIsLoading(false);
    };
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          setUser(null);
          router.push('/login');
        } else {
          setUser((prevUser: User | null) => JSON.stringify(prevUser) !== JSON.stringify(session.user) ? session.user : prevUser);
        }
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <UserContext.Provider value={{ user, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used within a UserProvider');
  return ctx;
} 