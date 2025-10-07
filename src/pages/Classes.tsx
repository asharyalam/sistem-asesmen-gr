"use client";

import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, Users, BarChart3 } from 'lucide-react'; // Menambahkan Users dan BarChart3
import AddClassDialog from '@/components/classes/AddClassDialog';
import EditClassDialog from '@/components/classes/EditClassDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
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
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
  created_at: string;
}

const Classes = () => {
  const { user } = useSession();
  const navigate = useNavigate(); // Inisialisasi useNavigate
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isEditClassDialogOpen, setIsEditClassDialogOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<Kelas | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDeleteId, setClassToDeleteId] = useState<string | null>(null);
  const [classToDeleteName, setClassToDeleteName] = useState<string | null>(null); // State to store class name for logging
  const queryClient = useQueryClient(); // Get queryClient here

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
    enabled: !!user,
  });

  const handleClassAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
  };

  const handleEditClick = (kelas: Kelas) => {
    setClassToEdit(kelas);
    setIsEditClassDialogOpen(true);
  };

  const handleClassUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
  };

  const handleDeleteClick = (classId: string, className: string) => {
    setClassToDeleteId(classId);
    setClassToDeleteName(className); // Store class name
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClass = async () => {
    if (!classToDeleteId || !user) return;

    const { error } = await supabase
      .from('kelas')
      .delete()
      .eq('id', classToDeleteId);

    if (error) {
      showError("Gagal menghapus kelas: " + error.message);
    } else {
      showSuccess("Kelas berhasil dihapus!");
      // Log activity, passing queryClient
      await logActivity(user, 'CLASS_DELETED', `Menghapus kelas: ${classToDeleteName}`, queryClient);
      queryClient.invalidateQueries({ queryKey: ['classes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['totalClasses', user.id] }); // Invalidate total classes
    }
    setIsDeleteDialogOpen(false);
    setClassToDeleteId(null);
    setClassToDeleteName(null);
  };

  if (isError) {
    showError("Gagal memuat kelas: " + error?.message);
  }

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-classesAccent-DEFAULT">Manajemen Kelas</h1>
      <p className="text-lg text-muted-foreground">
        Di sini Anda dapat melihat, menambah, mengedit, dan menghapus kelas yang Anda ajar.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Daftar Kelas</CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => navigate('/students')}
              className="rounded-lg bg-studentsAccent-DEFAULT text-white hover:bg-studentsAccent-DEFAULT/90 shadow-mac-sm"
            >
              <Users className="mr-2 h-4 w-4" /> Kelola Siswa
            </Button>
            <Button
              onClick={() => navigate('/attendance')}
              className="rounded-lg bg-attendanceAccent-DEFAULT text-white hover:bg-attendanceAccent-DEFAULT/90 shadow-mac-sm"
            >
              <BarChart3 className="mr-2 h-4 w-4" /> Kelola Kehadiran
            </Button>
            <Button
              onClick={() => setIsAddClassDialogOpen(true)}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kelas Baru
            </Button>
          </div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        onClick={() => handleEditClick(kelas)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(kelas.id, kelas.nama_kelas)} // Pass class name
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus
                      </Button>
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

      <EditClassDialog
        isOpen={isEditClassDialogOpen}
        onClose={() => setIsEditClassDialogOpen(false)}
        onClassUpdated={handleClassUpdated}
        classData={classToEdit}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl shadow-mac-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus kelas ini secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Classes;