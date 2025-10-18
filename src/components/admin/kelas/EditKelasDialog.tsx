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
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/utils/activityLogger';

const formSchema = z.object({
  nama_kelas: z.string().min(1, { message: "Nama kelas tidak boleh kosong." }),
  tahun_semester: z.string().min(1, { message: "Tahun/Semester tidak boleh kosong." }),
});

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
}

interface EditKelasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  dataToEdit: Kelas | null;
}

const EditKelasDialog: React.FC<EditKelasDialogProps> = ({ isOpen, onClose, onSave, dataToEdit }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kelas: "",
      tahun_semester: "",
    },
  });

  useEffect(() => {
    if (dataToEdit) {
      form.reset({
        nama_kelas: dataToEdit.nama_kelas,
        tahun_semester: dataToEdit.tahun_semester,
      });
    }
  }, [dataToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!dataToEdit?.id) {
      showError("ID kelas tidak ditemukan.");
      return;
    }
    if (!user) {
      showError("Anda harus login untuk memperbarui kelas.");
      return;
    }

    const { error } = await supabase
      .from('kelas')
      .update({
        nama_kelas: values.nama_kelas,
        tahun_semester: values.tahun_semester,
      })
      .eq('id', dataToEdit.id);

    if (error) {
      showError("Gagal memperbarui kelas: " + error.message);
    } else {
      showSuccess("Kelas berhasil diperbarui!");
      onSave();
      onClose();
      await logActivity(user, 'CLASS_UPDATED', `Memperbarui kelas: ${dataToEdit.nama_kelas} menjadi ${values.nama_kelas} (${values.tahun_semester})`, queryClient);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Edit Kelas</DialogTitle>
          <DialogDescription>
            Perbarui detail kelas Anda di sini.
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

export default EditKelasDialog;