"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, User as UserIcon, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/utils/activityLogger';

interface AvatarUploadProps {
  avatarUrl: string | null;
  onAvatarChange: (newUrl: string | null) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ avatarUrl, onAvatarChange }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (avatarUrl) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
      setPreviewUrl(data.publicUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [avatarUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      showError("Anda harus login untuk mengunggah avatar.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      showError("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldFilePath = avatarUrl;
        const { error: deleteError } = await supabase.storage.from('avatars').remove([oldFilePath]);
        if (deleteError) {
          console.warn("Gagal menghapus avatar lama:", deleteError.message);
          // Don't block upload if old avatar deletion fails
        }
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newPublicUrl = publicUrlData.publicUrl;

      onAvatarChange(filePath); // Pass the storage path, not the public URL
      setPreviewUrl(newPublicUrl);
      showSuccess("Avatar berhasil diunggah!");
      await logActivity(user, 'PROFILE_UPDATED', 'Mengunggah avatar baru.', queryClient);

    } catch (error: any) {
      showError("Gagal mengunggah avatar: " + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    setUploading(true);
    try {
      const { error: deleteError } = await supabase.storage.from('avatars').remove([avatarUrl]);
      if (deleteError) {
        throw deleteError;
      }
      onAvatarChange(null);
      setPreviewUrl(null);
      showSuccess("Avatar berhasil dihapus!");
      await logActivity(user, 'PROFILE_UPDATED', 'Menghapus avatar.', queryClient);
    } catch (error: any) {
      showError("Gagal menghapus avatar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-24 w-24 border-2 border-primary shadow-mac-sm">
        <AvatarImage src={previewUrl || undefined} alt="Avatar Pengguna" />
        <AvatarFallback className="bg-primary/20 text-primary">
          {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <UserIcon className="h-12 w-12" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="avatar-upload" className="sr-only">Unggah Avatar</Label>
        <Input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          ref={fileInputRef}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="rounded-lg shadow-mac-sm"
        >
          <Camera className="mr-2 h-4 w-4" /> {uploading ? "Mengunggah..." : "Ubah Avatar"}
        </Button>
        {avatarUrl && (
          <Button
            onClick={handleRemoveAvatar}
            disabled={uploading}
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 rounded-lg"
          >
            <XCircle className="mr-2 h-4 w-4" /> Hapus Avatar
          </Button>
        )}
      </div>
    </div>
  );
};

export default AvatarUpload;