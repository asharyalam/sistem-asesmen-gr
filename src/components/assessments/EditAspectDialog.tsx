"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

const formSchema = z.object({
  deskripsi: z.string().min(1, { message: "Deskripsi aspek tidak boleh kosong." }),
  skor_maksimal: z.coerce.number().min(1, { message: "Skor maksimal harus minimal 1." }),
  urutan: z.coerce.number().min(1, { message: "Urutan harus minimal 1." }),
});

interface EditAspectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAspectUpdated: () => void;
  aspectData: {
    id: string;
    deskripsi: string;
    skor_maksimal: number;
    urutan: number;
  } | null;
}

const EditAspectDialog: React.FC<EditAspectDialogProps> = ({ isOpen, onClose, onAspectUpdated, aspectData }) => {
  const { user } = useSession(); // Get user from session
  const queryClient = useQueryClient(); // Get queryClient here
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deskripsi: "",
      skor_maksimal: 1,
      urutan: 1,
    },
  });

  useEffect(() => {
    if (aspectData) {
      form.reset({
        deskripsi: aspectData.deskripsi,
        skor_maksimal: aspectData.skor_maksimal,
        urutan: aspectData.urutan,
      });
    }
  }, [aspectData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!aspectData?.id) {
      showError("ID aspek penilaian tidak ditemukan.");
      return;
    }
    if (!user) {
      showError("Anda harus login untuk memperbarui aspek penilaian.");
      return;
    }

    const { error } = await supabase
      .from('aspek_penilaian')
      .update({
        deskripsi: values.deskripsi,
        skor_maksimal: values.skor_maksimal,
        urutan: values.urutan,
      })
      .eq('id', aspectData.id);

    if (error) {
      showError("Gagal memperbarui aspek penilaian: " + error.message);
    } else {
      showSuccess("Aspek penilaian berhasil diperbarui!");
      onAspectUpdated();
      onClose();
      // Log activity, passing queryClient
      await logActivity(user, 'ASPECT_UPDATED', `Memperbarui aspek penilaian: ${aspectData.deskripsi} menjadi ${values.deskripsi} (ID: ${aspectData.id})`, queryClient);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Edit Aspek Penilaian</DialogTitle>
          <DialogDescription>
            Perbarui detail aspek penilaian Anda di sini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="deskripsi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Aspek</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Kerapian Tulisan" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="skor_maksimal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skor Maksimal</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urutan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urutan</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAspectDialog;