"use client";

import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Edit, Trash2, FileUp } from 'lucide-react';
import AddStudentDialog from '@/components/students/AddStudentDialog';
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
import EditStudentDialog from '@/components/students/EditStudentDialog';
import ImportStudentsDialog from '@/components/students/ImportStudentsDialog';
import { logActivity } from '@/utils/activityLogger'; // Import logActivity
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
  id_kelas: string;
  kelas: {
    nama_kelas: string;
  };
  created_at: string;
}

const Students = () => {
  const { user } = useSession();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Siswa | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDeleteId, setStudentToDeleteId] = useState<string | null>(null);
  const [studentToDeleteName, setStudentToDeleteName] = useState<string | null>(null); // State to store student name for logging
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const queryClient = useQueryClient(); // Get queryClient here

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page
  const [totalItems, setTotalItems] = useState(0);

  const { data: students, isLoading, isError, error } = useQuery<Siswa[], Error>({
    queryKey: ['students', user?.id, currentPage], // Add currentPage to queryKey
    queryFn: async () => {
      if (!user) return [];
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('siswa')
        .select(`
          id,
          nama_siswa,
          nis_nisn,
          created_at,
          id_kelas,
          kelas (nama_kelas)
        `, { count: 'exact' })
        .eq('kelas.id_guru', user.id)
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex); // Apply range for pagination

      if (error) {
        throw new Error(error.message);
      }
      setTotalItems(count || 0); // Update total items for pagination
      return data || [];
    },
    enabled: !!user,
  });

  const handleStudentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
  };

  const handleStudentImported = () => {
    queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
  };

  const handleEditClick = (student: Siswa) => {
    setStudentToEdit(student);
    setIsEditStudentDialogOpen(true);
  };

  const handleStudentUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
  };

  const handleDeleteClick = (studentId: string, studentName: string) => {
    setStudentToDeleteId(studentId);
    setStudentToDeleteName(studentName); // Store student name
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDeleteId || !user) return;

    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('id', studentToDeleteId);

    if (error) {
      showError("Gagal menghapus siswa: " + error.message);
    } else {
      showSuccess("Siswa berhasil dihapus!");
      // Log activity, passing queryClient
      await logActivity(user, 'STUDENT_DELETED', `Menghapus siswa: ${studentToDeleteName}`, queryClient);
      queryClient.invalidateQueries({ queryKey: ['students', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['totalStudents', user.id] });
    }
    setIsDeleteDialogOpen(false);
    setStudentToDeleteId(null);
    setStudentToDeleteName(null);
  };

  if (isError) {
    showError("Gagal memuat siswa: " + error?.message);
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-studentsAccent-DEFAULT">Manajemen Siswa</h1>
      <p className="text-lg text-muted-foreground">
        Kelola daftar siswa Anda di sini, termasuk menambahkan siswa ke kelas tertentu.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Daftar Siswa</CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
            >
              <FileUp className="mr-2 h-4 w-4" /> Impor dari Excel
            </Button>
            <Button
              onClick={() => setIsAddStudentDialogOpen(true)}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa Baru
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
          ) : students && students.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NIS/NISN</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Dibuat Pada</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.nama_siswa}</TableCell>
                      <TableCell>{student.nis_nisn}</TableCell>
                      <TableCell>{student.kelas?.nama_kelas || 'N/A'}</TableCell>
                      <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10"
                          onClick={() => handleEditClick(student)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(student.id, student.nama_siswa)} // Pass student name
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Belum ada siswa yang terdaftar.</p>
          )}
        </CardContent>
      </Card>

      <AddStudentDialog
        isOpen={isAddStudentDialogOpen}
        onClose={() => setIsAddStudentDialogOpen(false)}
        onStudentAdded={handleStudentAdded}
      />

      {studentToEdit && (
        <EditStudentDialog
          isOpen={isEditStudentDialogOpen}
          onClose={() => setIsEditStudentDialogOpen(false)}
          onStudentUpdated={handleStudentUpdated}
          studentData={studentToEdit}
        />
      )}

      <ImportStudentsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onStudentsImported={handleStudentImported}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl shadow-mac-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus siswa ini secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
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

export default Students;