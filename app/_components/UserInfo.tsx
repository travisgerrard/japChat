"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LogoutButton from './LogoutButton';

export default function UserInfo() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);
  if (!email) return null;
  return (
    <div className="flex items-center space-x-4 ml-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">{email}</span>
      <LogoutButton />
    </div>
  );
} 