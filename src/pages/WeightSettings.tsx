"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Settings, ListPlus } from 'lucide-react';
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
import ManageWeightCategoriesDialog from '@/components/weight-settings/ManageWeightCategoriesDialog';

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface KategoriBobot {
  id: string;
  nama_kategori: string;
}

interface PengaturanBobotKelas {
  id: string; // Add id for upserting
  id_kelas: string;
  id_kategori_bobot: string;
  bobot_persentase: number;
}

// Dynamically create form schema based on available categories
const createDynamicFormSchema = (categories: KategoriBobot[]) => {
  const schemaFields: { [key: string]: z.ZodNumber } = {};
  categories.forEach(category => {
    schemaFields[`bobot_${category.id}`] = z.coerce.number().min(0).max(100, { message: "Bobot harus antara 0 dan 100." });
  });
  return z.object({
    id_kelas: z.string().min(1, { message: "Kelas harus dipilih." }),
    ...schemaFields,
  });
};

const WeightSettings = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);

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

  // Fetch all global weight categories
  const { data: categories, isLoading: isLoadingCategories, isError: isErrorCategories, error: categoriesError } = useQuery<KategoriBobot[], Error>({
    queryKey: ['weightCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kategori_bobot')
        .select('id, nama_kategori')
        .order('nama_kategori', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
  });

  // Fetch existing weight settings for the selected class
  const { data: weightSettings, isLoading: isLoadingWeightSettings, isError: isErrorWeightSettings, error: weightSettingsError } = useQuery<PengaturanBobotKelas[], Error>({
    queryKey: ['weightSettings', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('pengaturan_bobot_kelas')
        .select('id, id_kelas, id_kategori_bobot, bobot_persentase')
        .eq('id_kelas', selectedClassId);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId,
  });

  const dynamicFormSchema = categories ? createDynamicFormSchema(categories) : z.object({ id_kelas: z.string() });

  const form = useForm<z.infer<typeof dynamicFormSchema>>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {
      id_kelas: "",
      // Dynamic default values will be set in useEffect
    },
  });

  useEffect(() => {
    if (selectedClassId && categories) {
      const defaultValues: { [key: string]: any } = { id_kelas: selectedClassId };
      categories.forEach(category => {
        const existingWeight = weightSettings?.find(ws => ws.id_kategori_bobot === category.id);
        defaultValues[`bobot_${category.id}`] = existingWeight ? existingWeight.bobot_persentase : 0;
      });
      form.reset(defaultValues);
    } else if (!selectedClassId) {
      form.reset({ id_kelas: "" }); // Reset if no class selected
    }
  }, [selectedClassId, categories, weightSettings, form]);

  const onSubmit = async (values: z.infer<typeof dynamicFormSchema>) => {
    if (!user) {
      showError("Anda harus login untuk menyimpan pengaturan bobot.");
      return;
    }
    if (!selectedClassId) {
      showError("Pilih kelas terlebih dahulu.");
      return;
    }
    if (!categories || categories.length === 0) {
      showError("Tidak ada kategori bobot yang didefinisikan. Harap tambahkan kategori terlebih dahulu.");
      return;
    }

    const upsertData = categories.map(category => {
      const bobotValue = values[`bobot_${category.id}`];
      return {
        id_kelas: selectedClassId,
        id_kategori_bobot: category.id,
        bobot_persentase: bobotValue,
      };
    });

    try {
      const { error } = await supabase
        .from('pengaturan_bobot_kelas')
        .upsert(upsertData, { onConflict: 'id_kelas, id_kategori_bobot' });

      if (error) {
        throw error;
      }

      showSuccess("Pengaturan bobot berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ['weightSettings', selectedClassId] }); // Refetch to update UI
    } catch (error: any) {
      showError("Gagal menyimpan pengaturan bobot: " + error.message);
    }
  };

  if (isErrorClasses) {
    showError("Gagal memuat kelas: " + classesError?.message);
  }
  if (isErrorCategories) {
    showError("Gagal memuat kategori bobot: " + categoriesError?.message);
  }
  if (isErrorWeightSettings) {
    showError("Gagal memuat pengaturan bobot: " + weightSettingsError?.message);
  }

  const isLoading = isLoadingClasses || isLoadingCategories || isLoadingWeightSettings;

  const totalCurrentWeight = categories?.reduce((sum, category) => {
    const fieldName = `bobot_${category.id}`;
    const value = form.watch(fieldName as any); // Use form.watch to get current value
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-weightSettingsAccent-DEFAULT">Pengaturan Bobot Penilaian</h1>
      <p className="text-lg text-muted-foreground">
        Atur bobot untuk berbagai kategori penilaian (misalnya, kehadiran, tugas, ujian) untuk setiap kelas.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Pilih Kelas</CardTitle>
          <Button
            onClick={() => setIsManageCategoriesDialogOpen(true)}
            className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
          >
            <ListPlus className="mr-2 h-4 w-4" /> Kelola Kategori
          </Button>
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
            ) : categories && categories.length > 0 ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {categories.map((category) => (
                    <FormField
                      key={category.id}
                      control={form.control}
                      name={`bobot_${category.id}` as keyof z.infer<typeof dynamicFormSchema>}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bobot {category.nama_kategori} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <div className="md:col-span-2 flex flex-col gap-4">
                    <div className="text-right text-sm font-medium">
                      Total Bobot Saat Ini: <span className={totalCurrentWeight !== 100 ? "text-destructive" : "text-primary"}>{totalCurrentWeight}%</span>
                      {totalCurrentWeight !== 100 && (
                        <p className="text-destructive text-xs mt-1">Total bobot harus 100%.</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm" disabled={totalCurrentWeight !== 100}>
                      <Save className="mr-2 h-4 w-4" /> Simpan Pengaturan Bobot
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <p className="text-muted-foreground">Tidak ada kategori bobot yang didefinisikan. Harap kelola kategori terlebih dahulu.</p>
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

      <ManageWeightCategoriesDialog
        isOpen={isManageCategoriesDialogOpen}
        onClose={() => setIsManageCategoriesDialogOpen(false)}
      />
    </div>
  );
};

export default WeightSettings;