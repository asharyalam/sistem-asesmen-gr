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
  nama_kategori: z.string().min(1, { message: "Nama kategori tidak boleh kosong." }),
});

interface KategoriBobot {
  id: string;
  nama_kategori: string;
}

interface EditKategoriBobotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  dataToEdit: KategoriBobot | null;
}

const EditKategoriBobotDialog: React.FC<EditKategoriBobotDialogProps> = ({ isOpen, onClose, onSave, dataToEdit }) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kategori: "",
    },
  });

  useEffect(() => {
    if (dataToEdit) {
      form.reset({
        nama_kategori: dataToEdit.nama_kategori,
      });
    }
  }, [dataToEdit, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!dataToEdit?.id) {
      showError("ID kategori bobot tidak ditemukan.");
      return;
    }
    if (!user) {
      showError("Anda harus login untuk memperbarui kategori bobot.");
      return;
    }

    const { error } = await supabase
      .from('kategori_bobot')
      .update({
        nama_kategori: values.nama_kategori,
      })
      .eq('id', dataToEdit.id);

    if (error) {
      showError("Gagal memperbarui kategori bobot: " + error.message);
    } else {
      showSuccess("Kategori bobot berhasil diperbarui!");
      onSave();
      onClose();
      await logActivity(user, 'WEIGHT_CATEGORY_UPDATED', `Memperbarui kategori bobot: ${dataToEdit.nama_kategori} menjadi ${values.nama_kategori}`, queryClient);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Edit Kategori Bobot</DialogTitle>
          <DialogDescription>
            Perbarui nama kategori bobot Anda di sini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="nama_kategori"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Tugas Harian" {...field} className="rounded-lg" />
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

export default EditKategoriBobotDialog;