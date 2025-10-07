"use client";

import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

const formSchema = z.object({
  numberOfAspects: z.coerce.number().min(1, { message: "Jumlah aspek minimal 1." }).max(20, { message: "Jumlah aspek maksimal 20." }),
  defaultMaxScore: z.coerce.number().min(1, { message: "Skor maksimal minimal 1." }),
});

interface AddMultipleAspectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAspectsAdded: () => void;
  assessmentId: string;
}

const AddMultipleAspectsDialog: React.FC<AddMultipleAspectsDialogProps> = ({ isOpen, onClose, onAspectsAdded, assessmentId }) => {
  const { user } = useSession(); // Get user from session
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numberOfAspects: 5,
      defaultMaxScore: 100,
    },
  });

  // Fetch the current max order to ensure new aspects are added sequentially
  const { data: maxOrder, isLoading: isLoadingMaxOrder } = useQuery<number, Error>({
    queryKey: ['maxAspectOrder', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aspek_penilaian')
        .select('urutan')
        .eq('id_penilaian', assessmentId)
        .order('urutan', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(error.message);
      }
      return data?.[0]?.urutan || 0;
    },
    enabled: isOpen && !!assessmentId,
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk menambahkan aspek penilaian.");
      return;
    }

    setIsSubmitting(true);
    try {
      const aspectsToInsert = [];
      const startingOrder = (maxOrder || 0) + 1;

      for (let i = 0; i < values.numberOfAspects; i++) {
        aspectsToInsert.push({
          id_penilaian: assessmentId,
          deskripsi: `Aspek ${startingOrder + i}`,
          skor_maksimal: values.defaultMaxScore,
          urutan: startingOrder + i,
        });
      }

      const { error } = await supabase
        .from('aspek_penilaian')
        .insert(aspectsToInsert);

      if (error) {
        showError("Gagal menambahkan aspek penilaian: " + error.message);
      } else {
        showSuccess(`${values.numberOfAspects} aspek penilaian berhasil ditambahkan!`);
        onAspectsAdded();
        onClose();
        form.reset();
        // Log activity
        await logActivity(user, 'ASPECT_ADDED', `Menambahkan ${values.numberOfAspects} aspek penilaian baru untuk penilaian ID: ${assessmentId}`);
      }
    } catch (error: any) {
      showError("Terjadi kesalahan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Tambah Beberapa Aspek Penilaian</DialogTitle>
          <DialogDescription>
            Tentukan berapa banyak aspek yang ingin Anda tambahkan secara otomatis.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="numberOfAspects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Aspek</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Contoh: 5" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultMaxScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skor Maksimal Default</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Contoh: 100" {...field} className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm" disabled={isSubmitting || isLoadingMaxOrder}>
                {isSubmitting ? "Menambahkan..." : "Tambahkan Aspek"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMultipleAspectsDialog;