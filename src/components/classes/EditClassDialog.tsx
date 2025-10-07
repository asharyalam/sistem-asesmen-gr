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
import { useSession } from '@/components/auth/SessionContextProvider';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

const formSchema = z.object({
  nama_kelas: z.string().min(1, { message: "Nama kelas tidak boleh kosong." }),
  tahun_semester: z.string().min(1, { message: "Tahun/Semester tidak boleh kosong." }),
});

interface EditClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClassUpdated: () => void;
  classData: {
    id: string;
    nama_kelas: string;
    tahun_semester: string;
  } | null;
}

const EditClassDialog: React.FC<EditClassDialogProps> = ({ isOpen, onClose, onClassUpdated, classData }) => {
  const { user } = useSession(); // Get user from session
  const queryClient = useQueryClient(); // Get queryClient here
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kelas: "",
      tahun_semester: "",
    },
  });

  useEffect(() => {
    if (classData) {
      form.reset({
        nama_kelas: classData.nama_kelas,
        tahun_semester: classData.tahun_semester,
      });
    }
  }, [classData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!classData?.id) {
      showError("ID kelas tidak ditemukan.");
      return;
    }

    const { error } = await supabase
      .from('kelas')
      .update({
        nama_kelas: values.nama_kelas,
        tahun_semester: values.tahun_semester,
      })
      .eq('id', classData.id);

    if (error) {
      showError("Gagal memperbarui kelas: " + error.message);
    } else {
      showSuccess("Kelas berhasil diperbarui!");
      onClassUpdated();
      onClose();
      // Log activity, passing queryClient
      await logActivity(user, 'CLASS_UPDATED', `Memperbarui kelas: ${classData.nama_kelas} menjadi ${values.nama_kelas} (${values.tahun_semester})`, queryClient);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Edit Kelas</DialogTitle>
          <DialogDescription>
            Perbarui detail kelas Anda di sini. Klik simpan saat Anda selesai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="nama_kelas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kelas</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Kelas X IPS 1" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tahun_semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tahun/Semester</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: 2023/2024 Ganjil" {...field} className="rounded-lg" />
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

export default EditClassDialog;