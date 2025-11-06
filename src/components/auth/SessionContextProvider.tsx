"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showLoading, dismissToast, showError, showSuccess } from '@/utils/toast';
import { logActivity } from '@/utils/activityLogger';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  useEffect(() => {
    let toastId: string | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change event detected:", event);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
        if (toastId) dismissToast(toastId);
        navigate('/');
        if (currentSession?.user) {
          await logActivity(currentSession.user, 'LOGIN', `Pengguna ${currentSession.user.email} berhasil login.`, queryClient);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("SIGNED_OUT event detected. Attempting to navigate to /login immediately.");
        navigate('/login'); // Pindahkan navigasi ke sini agar diprioritaskan

        if (user) {
          // Log activity secara asinkron setelah navigasi
          logActivity(user, 'LOGOUT', `Pengguna ${user.email} berhasil logout.`, queryClient)
            .catch(err => console.error("Failed to log logout activity:", err));
        }
        setSession(null);
        setUser(null); // Explicitly clear user on SIGNED_OUT
        setLoading(false);
        if (toastId) dismissToast(toastId);
        showSuccess("Anda telah berhasil logout.");
      } else if (event === 'INITIAL_SESSION') {
        setSession(currentSession);
        // Only update user if currentSession has a user.
        // If currentSession is null, but we already have a user, keep the existing user.
        // Only set to null if currentSession is null AND there was no previous user.
        if (currentSession?.user) {
          setUser(currentSession.user);
        } else if (!user) { // If no currentSession and no existing user, then set to null
          setUser(null);
        }
        setLoading(false);
        if (currentSession && location.pathname === '/login') {
          navigate('/');
        } else if (!currentSession && location.pathname !== '/login') {
          navigate('/login');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        if (currentSession?.user) {
          setUser(currentSession.user);
        }
        // If currentSession is null here, it means refresh failed, but we should still keep the user if it was there.
        // This event usually means a successful refresh, so currentSession.user should be present.
      } else {
        setLoading(false);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        showError(error.message);
        setLoading(false);
        navigate('/login');
        return;
      }
      setSession(initialSession);
      // Same logic as INITIAL_SESSION event
      if (initialSession?.user) {
        setUser(initialSession.user);
      } else if (!user) { // If no initialSession and no existing user, then set to null
        setUser(null);
      }
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
  }, [navigate, queryClient, user]); // Added 'user' back to dependencies to ensure logActivity gets latest user.

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