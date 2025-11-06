"use client";

import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const Header = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Gagal logout: " + error.message);
    }
  };

  const userFirstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Pengguna';
  const userAvatarUrl = user?.user_metadata?.avatar_url ? supabase.storage.from('avatars').getPublicUrl(user.user_metadata.avatar_url).data.publicUrl : undefined;

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card border-b border-border shadow-mac-sm rounded-xl mb-6">
      <div className="relative flex-1 max-w-md mr-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cari Program, Tugas, Penilaian..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background focus-visible:ring-ring focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 rounded-lg px-3 py-2 h-auto">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={userAvatarUrl} alt={userFirstName} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {userFirstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground hidden md:inline">{userFirstName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl shadow-mac-lg" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userFirstName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;