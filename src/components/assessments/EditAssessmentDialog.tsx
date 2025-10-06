"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery } from '@tanstack/react-query';

const formSchema = z.object({
  id_kelas: z.string().min(1, { message: "Kelas harus dipilih." }),
  nama_penilaian: z.string().min(1, { message: "Nama penilaian tidak boleh kosong." }),
  tanggal: z.date({ required_error: "Tanggal penilaian harus diisi." }),
  jenis_penilaian: z.string().min(1, { message: "Jenis penilaian tidak boleh kosong." }),
  bentuk_penilaian: z.string().min(1, { message: "Bentuk penilaian tidak boleh kosong." }),
  kode_tp: z.string().optional(),
});

interface EditAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentUpdated: () => void;
  assessmentData: {
    id: string;
    id_kelas: string;
    nama_penilaian: string;
    tanggal: string; // ISO date string
    jenis_penilaian: string;
    bentuk_penilaian: string;
    kode_tp: string | null;
    id_kategori_bobot_akhir: string | null; // Keep for initial data loading, but won't be used in form
  } | null;
}

const EditAssessmentDialog: React.FC<EditAssessmentDialogProps> = ({ isOpen, onClose, onAssessmentUpdated, assessmentData }) => {
  const { user } = useSession();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_kelas: "",
      nama_penilaian: "",
      tanggal: undefined,
      jenis_penilaian: "",
      bentuk_penilaian: "",
      kode_tp: "",
    },
  });

  useEffect(() => {
    if (assessmentData) {
      form.reset({
        id_kelas: assessmentData.id_kelas,
        nama_penilaian: assessmentData.nama_penilaian,
        tanggal: new Date(assessmentData.tanggal),
        jenis_penilaian: assessmentData.jenis_penilaian,
        bentuk_penilaian: assessmentData.bentuk_penilaian,
        kode_tp: assessmentData.kode_tp || "",
      });
    }
  }, [assessmentData, form]);

  const { data: classes, isLoading: isLoadingClasses } = useQuery<{ id: string; nama_kelas: string }[], Error>({
    queryKey: ['classesForAssessmentsEdit', user?.id],
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

  // Removed useQuery for weightCategories as it's no longer needed

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!assessmentData?.id) {
      showError("ID penilaian tidak ditemukan.");
      return;
    }

    const { error } = await supabase
      .from('penilaian')
      .update({
        id_kelas: values.id_kelas,
        nama_penilaian: values.nama_penilaian,
        tanggal: format(values.tanggal, 'yyyy-MM-dd'),
        jenis_penilaian: values.jenis_penilaian,
        bentuk_penilaian: values.bentuk_penilaian,
        kode_tp: values.kode_tp || null,
        id_kategori_bobot_akhir: null, // Explicitly set to null or remove if column allows
      })
      .eq('id', assessmentData.id);

    if (error) {
      showError("Gagal memperbarui penilaian: " + error.message);
    } else {
      showSuccess("Penilaian berhasil diperbarui!");
      onAssessmentUpdated();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Edit Penilaian</DialogTitle>
          <DialogDescription>
            Perbarui detail penilaian Anda di sini. Klik simpan saat Anda selesai.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="id_kelas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClasses}>
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
            <FormField
              control={form.control}
              name="nama_penilaian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Penilaian</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Ulangan Harian Bab 1" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tanggal"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Penilaian</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal rounded-lg",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jenis_penilaian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Penilaian</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Pilih Jenis Penilaian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Formatif">Formatif</SelectItem>
                      <SelectItem value="Sumatif">Sumatif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bentuk_penilaian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bentuk Penilaian</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Pilih Bentuk Penilaian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tertulis">Tertulis</SelectItem>
                      <SelectItem value="Lisan">Lisan</SelectItem>
                      <SelectItem value="Kinerja">Kinerja</SelectItem>
                      <SelectItem value="Produk">Produk</SelectItem>
                      <SelectItem value="Proyek">Proyek</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kode_tp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode TP (Opsional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: TP-1.1" {...field} className="rounded-lg" />
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

export default EditAssessmentDialog;