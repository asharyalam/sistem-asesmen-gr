"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { User as UserIcon, Mail, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { logActivity } from '@/utils/activityLogger';

const formSchema = z.object({
  first_name: z.string().min(1, { message: "Nama depan tidak boleh kosong." }),
  last_name: z.string().min(1, { message: "Nama belakang tidak boleh kosong." }),
  email: z.string().email({ message: "Email tidak valid." }),
});

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
    },
  });

  const { data: profile, isLoading: isLoadingProfile, isError: isErrorProfile, error: profileError } = useQuery<ProfileData, Error>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not logged in.");
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user && !sessionLoading,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || user?.email || "", // Fallback to auth email
      });
    }
  }, [profile, form, user?.email]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk memperbarui profil.");
      return;
    }

    try {
      // Update auth.users email if changed
      if (values.email !== user.email) {
        const { error: updateAuthError } = await supabase.auth.updateUser({ email: values.email });
        if (updateAuthError) {
          throw new Error("Gagal memperbarui email autentikasi: " + updateAuthError.message);
        }
      }

      // Update public.profiles
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email, // Update email in profiles table as well
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateProfileError) {
        throw new Error("Gagal memperbarui data profil: " + updateProfileError.message);
      }

      showSuccess("Profil berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      await logActivity(user, 'PROFILE_UPDATED', 'Memperbarui informasi profil.', queryClient);
    } catch (error: any) {
      showError("Gagal memperbarui profil: " + error.message);
    }
  };

  const handleAvatarChange = async (newAvatarPath: string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarPath, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
    } catch (error: any) {
      showError("Gagal memperbarui URL avatar: " + error.message);
    }
  };

  if (sessionLoading || isLoadingProfile) {
    return (
      <div className="flex-1 space-y-8 p-4">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-6 w-2/3 rounded-lg" />
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader>
            <Skeleton className="h-6 w-1/4 rounded-lg" />
          </CardHeader>
          <CardContent className="grid gap-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isErrorProfile) {
    showError("Gagal memuat profil: " + profileError?.message);
    return (
      <div className="flex-1 space-y-8 p-4">
        <h1 className="text-4xl font-extrabold text-primary">Profil Guru</h1>
        <p className="text-lg text-muted-foreground">Terjadi kesalahan saat memuat profil Anda.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-primary">Profil Guru</h1>
      <p className="text-lg text-muted-foreground">
        Perbarui informasi pribadi dan avatar Anda di sini.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Informasi Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4">
              <AvatarUpload avatarUrl={profile?.avatar_url || null} onAvatarChange={handleAvatarChange} />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Depan</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Depan" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Belakang</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Belakang" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} className="rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
                <Save className="mr-2 h-4 w-4" /> Simpan Perubahan
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;