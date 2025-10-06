"use client";

import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddClassDialog from '@/components/classes/AddClassDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
  created_at: string;
}

const Classes = () => {
  const { user } = useSession();
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: classes, isLoading, isError, error } = useQuery<Kelas[], Error>({
    queryKey: ['classes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tahun_semester, created_at')
        .eq('id_guru', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user, // Only run query if user is available
  });

  const handleClassAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['classes', user?.id] }); // Refetch classes after adding a new one
  };

  if (isError) {
    showError("Gagal memuat kelas: " + error?.message);
  }

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-foreground">Manajemen Kelas</h1>
      <p className="text-lg text-muted-foreground">
        Di sini Anda dapat melihat, menambah, mengedit, dan menghapus kelas yang Anda ajar.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Daftar Kelas</CardTitle>
          <Button
            onClick={() => setIsAddClassDialogOpen(true)}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kelas Baru
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : classes && classes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Tahun/Semester</TableHead>
                  <TableHead>Dibuat Pada</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((kelas) => (
                  <TableRow key={kelas.id}>
                    <TableCell className="font-medium">{kelas.nama_kelas}</TableCell>
                    <TableCell>{kelas.tahun_semester}</TableCell>
                    <TableCell>{new Date(kelas.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {/* Aksi seperti Edit/Hapus akan ditambahkan di sini */}
                      <Button variant="ghost" size="sm">Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive">Hapus</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Belum ada kelas yang terdaftar.</p>
          )}
        </CardContent>
      </Card>

      <AddClassDialog
        isOpen={isAddClassDialogOpen}
        onClose={() => setIsAddClassDialogOpen(false)}
        onClassAdded={handleClassAdded}
      />
    </div>
  );
};

export default Classes;