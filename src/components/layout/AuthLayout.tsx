"use client";

import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header'; // Import the new Header component
import { useSession } from '@/components/auth/SessionContextProvider';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useSession(); // Dapatkan user dan loading dari session
  const navigate = useNavigate();

  useEffect(() => {
    // Jika tidak sedang memuat dan tidak ada pengguna, arahkan ke halaman login
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]); // Tambahkan user, loading, dan navigate sebagai dependencies

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-foreground">Memuat aplikasi...</p>
      </div>
    );
  }

  // Jika user adalah null dan tidak sedang memuat, useEffect di atas akan menangani redirect.
  // Jadi, jika kita mencapai sini, berarti user ada (atau loading adalah true, yang sudah ditangani di atas).
  // Kita bisa merender layout.
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col p-6"> {/* Adjusted padding for main content */}
        <Header /> {/* Render the new Header component */}
        <main className="flex-1">
          {children}
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default AuthLayout;