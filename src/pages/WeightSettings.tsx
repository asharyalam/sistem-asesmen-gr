"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface PengaturanBobotKelas {
  id_kelas: string;
  bobot_kehadiran: number;
  bobot_tp_1: number;
  bobot_tp_2: number;
  bobot_tp_3: number;
  bobot_tp_4: number;
  bobot_tp_5: number;
  bobot_tp_6: number;
  bobot_tp_7: number;
  bobot_tp_8: number;
  bobot_tp_9: number;
  bobot_tp_10: number;
  bobot_tp_11: number;
  bobot_tp_12: number;
  bobot_sumatif_umum: number;
}

const formSchema = z.object({
  id_kelas: z.string().min(1, { message: "Kelas harus dipilih." }),
  bobot_kehadiran: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_1: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_2: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_3: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_4: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_5: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_6: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_7: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_8: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_9: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_10: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_11: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_tp_12: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
  bobot_sumatif_umum: z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." }),
});

const WeightSettings = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_kelas: "",
      bobot_kehadiran: 0,
      bobot_tp_1: 0,
      bobot_tp_2: 0,
      bobot_tp_3: 0,
      bobot_tp_4: 0,
      bobot_tp_5: 0,
      bobot_tp_6: 0,
      bobot_tp_7: 0,
      bobot_tp_8: 0,
      bobot_tp_9: 0,
      bobot_tp_10: 0,
      bobot_tp_11: 0,
      bobot_tp_12: 0,
      bobot_sumatif_umum: 0,
    },
  });

  // Fetch classes for the current user
  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<Kelas[], Error>({
    queryKey: ['classesForWeightSettings', user?.id],
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
    enabled: !!user,
  });

  // Fetch existing weight settings for the selected class
  const { data: weightSettings, isLoading: isLoadingWeightSettings, isError: isErrorWeightSettings, error: weightSettingsError } = useQuery<PengaturanBobotKelas | null, Error>({
    queryKey: ['weightSettings', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      const { data, error } = await supabase
        .from('pengaturan_bobot_kelas')
        .select('*')
        .eq('id_kelas', selectedClassId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw new Error(error.message);
      }
      return data || null;
    },
    enabled: !!selectedClassId,
  });

  useEffect(() => {
    if (selectedClassId) {
      form.setValue('id_kelas', selectedClassId);
      if (weightSettings) {
        form.reset({
          id_kelas: selectedClassId,
          bobot_kehadiran: weightSettings.bobot_kehadiran,
          bobot_tp_1: weightSettings.bobot_tp_1,
          bobot_tp_2: weightSettings.bobot_tp_2,
          bobot_tp_3: weightSettings.bobot_tp_3,
          bobot_tp_4: weightSettings.bobot_tp_4,
          bobot_tp_5: weightSettings.bobot_tp_5,
          bobot_tp_6: weightSettings.bobot_tp_6,
          bobot_tp_7: weightSettings.bobot_tp_7,
          bobot_tp_8: weightSettings.bobot_tp_8,
          bobot_tp_9: weightSettings.bobot_tp_9,
          bobot_tp_10: weightSettings.bobot_tp_10,
          bobot_tp_11: weightSettings.bobot_tp_11,
          bobot_tp_12: weightSettings.bobot_tp_12,
          bobot_sumatif_umum: weightSettings.bobot_sumatif_umum,
        });
      } else {
        // Reset to default if no settings found for the selected class
        form.reset({
          id_kelas: selectedClassId,
          bobot_kehadiran: 0,
          bobot_tp_1: 0,
          bobot_tp_2: 0,
          bobot_tp_3: 0,
          bobot_tp_4: 0,
          bobot_tp_5: 0,
          bobot_tp_6: 0,
          bobot_tp_7: 0,
          bobot_tp_8: 0,
          bobot_tp_9: 0,
          bobot_tp_10: 0,
          bobot_tp_11: 0,
          bobot_tp_12: 0,
          bobot_sumatif_umum: 0,
        });
      }
    } else {
      form.reset(form.formState.defaultValues); // Reset all if no class selected
    }
  }, [selectedClassId, weightSettings, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk menyimpan pengaturan bobot.");
      return;
    }
    if (!selectedClassId) {
      showError("Pilih kelas terlebih dahulu.");
      return;
    }

    const { error } = await supabase
      .from('pengaturan_bobot_kelas')
      .upsert(
        {
          id_kelas: values.id_kelas,
          bobot_kehadiran: values.bobot_kehadiran,
          bobot_tp_1: values.bobot_tp_1,
          bobot_tp_2: values.bobot_tp_2,
          bobot_tp_3: values.bobot_tp_3,
          bobot_tp_4: values.bobot_tp_4,
          bobot_tp_5: values.bobot_tp_5,
          bobot_tp_6: values.bobot_tp_6,
          bobot_tp_7: values.bobot_tp_7,
          bobot_tp_8: values.bobot_tp_8,
          bobot_tp_9: values.bobot_tp_9,
          bobot_tp_10: values.bobot_tp_10,
          bobot_tp_11: values.bobot_tp_11,
          bobot_tp_12: values.bobot_tp_12,
          bobot_sumatif_umum: values.bobot_sumatif_umum,
        },
        { onConflict: 'id_kelas' } // Use id_kelas as the conflict target for upsert
      );

    if (error) {
      showError("Gagal menyimpan pengaturan bobot: " + error.message);
    } else {
      showSuccess("Pengaturan bobot berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ['weightSettings', selectedClassId] }); // Refetch to update UI
    }
  };

  if (isErrorClasses) {
    showError("Gagal memuat kelas: " + classesError?.message);
  }
  if (isErrorWeightSettings && weightSettingsError?.code !== 'PGRST116') { // Ignore "no rows found" error
    showError("Gagal memuat pengaturan bobot: " + weightSettingsError?.message);
  }

  const isLoading = isLoadingClasses || isLoadingWeightSettings;

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-weightSettingsAccent-DEFAULT">Pengaturan Bobot Penilaian</h1>
      <p className="text-lg text-muted-foreground">
        Atur bobot untuk berbagai kategori penilaian (misalnya, kehadiran, tugas, ujian) untuk setiap kelas.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pilih Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedClassId} value={selectedClassId || ""}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
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
        </CardContent>
      </Card>

      {selectedClassId && (
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Bobot Penilaian untuk {classes?.find(c => c.id === selectedClassId)?.nama_kelas}</CardTitle>
            <Settings className="h-5 w-5 text-weightSettingsAccent-DEFAULT" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <FormField
                    control={form.control}
                    name="bobot_kehadiran"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bobot Kehadiran (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <FormField
                      key={`bobot_tp_${i + 1}`}
                      control={form.control}
                      name={`bobot_tp_${i + 1}` as keyof z.infer<typeof formSchema>}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bobot TP {i + 1} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="bobot_sumatif_umum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bobot Sumatif Umum (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="rounded-lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
                      <Save className="mr-2 h-4 w-4" /> Simpan Pengaturan Bobot
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClassId && !isLoadingClasses && (
        <Card className="rounded-xl shadow-mac-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            Pilih kelas dari daftar di atas untuk mulai mengatur bobot penilaian.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeightSettings;