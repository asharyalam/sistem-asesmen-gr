"use client";

import React from 'react';
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
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

const formSchema = z.object({
  nama_kelas: z.string().min(1, { message: "Nama kelas tidak boleh kosong." }),
  tahun_semester: z.string().min(1, { message: "Tahun/Semester tidak boleh kosong." }),
});

interface AddClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClassAdded: () => void;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({ isOpen, onClose, onClassAdded }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kelas: "",
      tahun_semester: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk menambahkan kelas.");
      return;
    }

    const { data, error } = await supabase
      .from('kelas')
      .insert({
        id_guru: user.id,
        nama_kelas: values.nama_kelas,
        tahun_semester: values.tahun_semester,
      })
      .select();

    if (error) {
      showError("Gagal menambahkan kelas: " + error.message);
    } else {
      showSuccess("Kelas berhasil ditambahkan!");
      onClassAdded();
      onClose();
      form.reset();

      // Log activity
      await logActivity(user, 'CLASS_ADDED', `Menambahkan kelas baru: ${values.nama_kelas} (${values.tahun_semester})`);
      queryClient.invalidateQueries({ queryKey: ['totalClasses', user.id] }); // Invalidate total classes
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Tambah Kelas Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail kelas baru Anda di sini. Klik simpan saat Anda selesai.
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
                Simpan Kelas
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;