"use client";

import React from 'react';
import Sidebar from './Sidebar';
import { useSession } from '@/components/auth/SessionContextProvider';
import { MadeWithDyad } from '@/components/made-with-dyad';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Memuat aplikasi...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6">
        {children}
        <MadeWithDyad />
      </main>
    </div>
  );
};

export default AuthLayout;