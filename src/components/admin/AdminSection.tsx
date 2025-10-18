"use client";

import React, { useState, useEffect, ComponentType } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { logActivity } from '@/utils/activityLogger';

interface AdminSectionProps<T> {
  tableName: string;
  title: string;
  description: string;
  columns: { header: string; accessorKey: string; render?: (row: T) => React.ReactNode }[];
  AddDialogComponent: ComponentType<{ isOpen: boolean; onClose: () => void; onSave: () => void }>;
  EditDialogComponent: ComponentType<{ isOpen: boolean; onClose: () => void; onSave: () => void; dataToEdit: T | null }>;
  deleteActivityType: string;
  deleteDescription: (item: T) => string;
}

const AdminSection = <T extends { id: string; [key: string]: any }>({
  tableName,
  title,
  description,
  columns,
  AddDialogComponent,
  EditDialogComponent,
  deleteActivityType,
  deleteDescription,
}: AdminSectionProps<T>) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [dataToEdit, setDataToEdit] = useState<T | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);

  const { data, isLoading, isError, error } = useQuery<T[], Error>({
    queryKey: [tableName, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false }); // Assuming most tables have created_at

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: [tableName, user?.id] });
  };

  const handleEditClick = (item: T) => {
    setDataToEdit(item);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (item: T) => {
    setItemToDeleteId(item.id);
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDeleteId || !user || !itemToDelete) return;

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', itemToDeleteId);

    if (error) {
      showError(`Gagal menghapus ${tableName}: ` + error.message);
    } else {
      showSuccess(`${tableName} berhasil dihapus!`);
      await logActivity(user, deleteActivityType as any, deleteDescription(itemToDelete), queryClient);
      queryClient.invalidateQueries({ queryKey: [tableName, user?.id] });
    }
    setIsDeleteDialogOpen(false);
    setItemToDeleteId(null);
    setItemToDelete(null);
  };

  if (isError) {
    showError(`Gagal memuat data ${tableName}: ` + error?.message);
  }

  return (
    <Card className="rounded-xl shadow-mac-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Baru
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : data && data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.accessorKey}>{col.header}</TableHead>
                ))}
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={col.accessorKey}>
                      {col.render ? col.render(item) : item[col.accessorKey]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:bg-primary/10"
                      onClick={() => handleEditClick(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">Belum ada data {tableName} yang terdaftar.</p>
        )}
      </CardContent>

      <AddDialogComponent isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onSave={handleSave} />
      {dataToEdit && (
        <EditDialogComponent isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSave={handleSave} dataToEdit={dataToEdit} />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl shadow-mac-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data {itemToDelete?.id} secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminSection;