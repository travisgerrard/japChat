"use client";
import { useEffect, useState } from 'react';
import LogoutButton from './LogoutButton';

export default function UserInfo({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <div className="flex items-center space-x-4 ml-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">{email}</span>
      <LogoutButton />
    </div>
  );
} 