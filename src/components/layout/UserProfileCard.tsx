"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const UserProfileCard = () => {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="flex flex-col items-center p-4 border-b border-sidebar-border mb-6">
        <Skeleton className="h-20 w-20 rounded-full mb-3" />
        <Skeleton className="h-5 w-3/4 mb-1" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  const userFirstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Pengguna';
  const userLastName = user?.user_metadata?.last_name || '';
  const userRole = "Guru"; // Assuming a fixed role for this app
  const userAvatarUrl = user?.user_metadata?.avatar_url ? supabase.storage.from('avatars').getPublicUrl(user.user_metadata.avatar_url).data.publicUrl : undefined;

  return (
    <div className="flex flex-col items-center p-4 border-b border-sidebar-border mb-6">
      <Avatar className="h-20 w-20 border-2 border-primary shadow-mac-sm mb-3">
        <AvatarImage src={userAvatarUrl} alt={userFirstName} />
        <AvatarFallback className="bg-primary/20 text-primary text-2xl">
          {userFirstName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h3 className="text-lg font-semibold text-foreground">
        {userFirstName} {userLastName}
      </h3>
      <p className="text-sm text-muted-foreground">{userRole}</p>
    </div>
  );
};

export default UserProfileCard;