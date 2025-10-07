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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSession } from '@/components/auth/SessionContextProvider'; // Import useSession
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

interface KategoriBobot {
  id: string;
  nama_kategori: string;
}

const formSchema = z.object({
  nama_kategori: z.string().min(1, { message: "Nama kategori tidak boleh kosong." }),
});

interface ManageWeightCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageWeightCategoriesDialog: React.FC<ManageWeightCategoriesDialogProps> = ({ isOpen, onClose }) => {
  const { user } = useSession(); // Get user from session
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<KategoriBobot | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [categoryToDeleteName, setCategoryToDeleteName] = useState<string | null>(null); // State to store category name for logging

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kategori: "",
    },
  });

  const { data: categories, isLoading, isError, error } = useQuery<KategoriBobot[], Error>({
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
    enabled: isOpen,
  });

  React.useEffect(() => {
    if (editingCategory) {
      form.reset({ nama_kategori: editingCategory.nama_kategori });
    } else {
      form.reset({ nama_kategori: "" });
    }
  }, [editingCategory, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError("Anda harus login untuk mengelola kategori bobot.");
      return;
    }

    if (editingCategory) {
      // Update existing category
      const { error } = await supabase
        .from('kategori_bobot')
        .update({ nama_kategori: values.nama_kategori })
        .eq('id', editingCategory.id);

      if (error) {
        showError("Gagal memperbarui kategori: " + error.message);
      } else {
        showSuccess("Kategori berhasil diperbarui!");
        queryClient.invalidateQueries({ queryKey: ['weightCategories'] });
        setEditingCategory(null);
        form.reset();
        // Log activity
        await logActivity(user, 'WEIGHT_CATEGORY_UPDATED', `Memperbarui kategori bobot: ${editingCategory.nama_kategori} menjadi ${values.nama_kategori}`);
      }
    } else {
      // Add new category
      const { error } = await supabase
        .from('kategori_bobot')
        .insert({ nama_kategori: values.nama_kategori });

      if (error) {
        showError("Gagal menambahkan kategori: " + error.message);
      } else {
        showSuccess("Kategori berhasil ditambahkan!");
        queryClient.invalidateQueries({ queryKey: ['weightCategories'] });
        form.reset();
        setIsAdding(false);
        // Log activity
        await logActivity(user, 'WEIGHT_CATEGORY_ADDED', `Menambahkan kategori bobot baru: ${values.nama_kategori}`);
      }
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDeleteId || !user) return;

    const { error } = await supabase
      .from('kategori_bobot')
      .delete()
      .eq('id', categoryToDeleteId);

    if (error) {
      showError("Gagal menghapus kategori: " + error.message);
    } else {
      showSuccess("Kategori berhasil dihapus!");
      // Log activity
      await logActivity(user, 'WEIGHT_CATEGORY_DELETED', `Menghapus kategori bobot: ${categoryToDeleteName}`);
      queryClient.invalidateQueries({ queryKey: ['weightCategories'] });
    }
    setIsDeleteDialogOpen(false);
    setCategoryToDeleteId(null);
    setCategoryToDeleteName(null);
  };

  if (isError) {
    showError("Gagal memuat kategori bobot: " + error?.message);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl shadow-mac-lg">
        <DialogHeader>
          <DialogTitle>Kelola Kategori Bobot</DialogTitle>
          <DialogDescription>
            Tambah, edit, atau hapus kategori yang akan digunakan dalam pengaturan bobot penilaian.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            onClick={() => { setIsAdding(true); setEditingCategory(null); }}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori Baru
          </Button>

          {(isAdding || editingCategory) && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setIsAdding(false); setEditingCategory(null); form.reset(); }}
                    className="rounded-lg"
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
                    {editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <h3 className="text-lg font-semibold mt-4">Daftar Kategori</h3>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.nama_kategori}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        onClick={() => { setEditingCategory(category); setIsAdding(false); }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => { setCategoryToDeleteId(category.id); setCategoryToDeleteName(category.nama_kategori); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Belum ada kategori bobot yang dibuat.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl shadow-mac-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus kategori ini secara permanen.
              Semua pengaturan bobot yang terkait dengan kategori ini juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ManageWeightCategoriesDialog;