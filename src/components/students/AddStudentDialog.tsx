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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

const formSchema = z.object({
  nama_siswa: z.string().min(1, { message: "Nama siswa tidak boleh kosong." }),
  nis_nisn: z.string().min(1, { message: "NIS/NISN tidak boleh kosong." }),
  id_kelas: z.string().min(1, { message: "Kelas harus dipilih." }),
});

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: () => void;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({ isOpen, onClose, onStudentAdded }) => {
  const { user } = useSession();
  const queryClient = useQueryClient(); // Get queryClient here
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_siswa: "",
      nis_nisn: "",
      id_kelas: "",
    },
  });

  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<{ id: string; nama_kelas: string }[], Error>({
    queryKey: ['classesForStudents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('kelas')
        .select('id, nama_kelas')
        .eq('id_guru', user.id)
        .order('nama_kelas', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk menambahkan siswa.");
      return;
    }

    const { error } = await supabase
      .from('siswa')
      .insert({
        id_kelas: values.id_kelas,
        nama_siswa: values.nama_siswa,
        nis_nisn: values.nis_nisn,
      });

    if (error) {
      showError("Gagal menambahkan siswa: " + error.message);
    } else {
      showSuccess("Siswa berhasil ditambahkan!");
      onStudentAdded();
      onClose();
      form.reset();

      // Log activity, passing queryClient
      const className = classes?.find(c => c.id === values.id_kelas)?.nama_kelas || 'Unknown Class';
      await logActivity(user, 'STUDENT_ADDED', `Menambahkan siswa baru: ${values.nama_siswa} (${values.nis_nisn}) ke kelas ${className}`, queryClient);
      queryClient.invalidateQueries({ queryKey: ['totalStudents', user.id] });
    }
  };

  if (isErrorClasses) {
    showError("Gagal memuat daftar kelas: " + classesError?.message);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Tambah Siswa Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail siswa baru Anda di sini. Pilih kelas tempat siswa akan didaftarkan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="nama_siswa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Siswa</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Budi Santoso" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nis_nisn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIS/NISN</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: 1234567890" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="id_kelas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingClasses}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Pilih Kelas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingClasses ? (
                        <SelectItem value="loading" disabled>Memuat kelas...</SelectItem>
                      ) : classes && classes.length > 0 ? (
                        classes.map((kelas) => (
                          <SelectItem key={kelas.id} value={kelas.id}>
                            {kelas.nama_kelas}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-classes" disabled>Tidak ada kelas tersedia</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
                Simpan Siswa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;