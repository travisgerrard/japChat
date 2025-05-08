'use client';

import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      // Optionally display an error message to the user
    } else {
      // Redirect to login page after successful logout
      router.push('/login');
      // You might want to refresh the page or clear local state as well
      // router.refresh(); // Uncomment if you want to force a server component refresh
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
    >
      Logout
    </button>
  );
}