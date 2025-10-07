"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showLoading, dismissToast, showError } from '@/utils/toast';
import { logActivity } from '@/utils/activityLogger'; // Import logActivity
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

interface SessionContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get queryClient here

  useEffect(() => {
    let toastId: string | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
        if (toastId) dismissToast(toastId);
        navigate('/'); // Redirect to dashboard after login
        if (currentSession?.user) {
          await logActivity(currentSession.user, 'LOGIN', `Pengguna ${currentSession.user.email} berhasil login.`, queryClient);
        }
      } else if (event === 'SIGNED_OUT') {
        if (user) { // Log logout for the user who was signed in
          await logActivity(user, 'LOGOUT', `Pengguna ${user.email} berhasil logout.`, queryClient);
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        if (toastId) dismissToast(toastId);
        navigate('/login'); // Redirect to login after logout
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
        if (currentSession && location.pathname === '/login') {
          navigate('/');
        } else if (!currentSession && location.pathname !== '/login') {
          navigate('/login');
        }
      } else if (event === 'MFA_CHALLENGE_VERIFIED') {
        // Handle MFA challenge verified if needed
      } else if (event === 'PASSWORD_RECOVERY') {
        // Handle password recovery if needed
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } else {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        showError(error.message);
        setLoading(false);
        navigate('/login');
        return;
      }
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(false);
      if (initialSession && location.pathname === '/login') {
        navigate('/');
      } else if (!initialSession && location.pathname !== '/login') {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
      if (toastId) dismissToast(toastId);
    };
  }, [navigate, user, queryClient]); // Added queryClient to dependency array

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};