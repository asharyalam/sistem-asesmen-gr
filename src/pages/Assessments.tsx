"use client";

import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Edit, Trash2, ListChecks } from 'lucide-react';
import AddAssessmentDialog from '@/components/assessments/AddAssessmentDialog';
import EditAssessmentDialog from '@/components/assessments/EditAssessmentDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
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
import { useNavigate } from 'react-router-dom';

interface Penilaian {
  id: string;
  nama_penilaian: string;
  tanggal: string;
  jenis_penilaian: string;
  bentuk_penilaian: string;
  kode_tp: string | null;
  id_kelas: string;
  kelas: {
    nama_kelas: string;
  };
  id_kategori_bobot_akhir: string | null;
  kategori_bobot: {
    nama_kategori: string;
  } | null;
  created_at: string;
}

const Assessments = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isAddAssessmentDialogOpen, setIsAddAssessmentDialogOpen] = useState(false);
  const [isEditAssessmentDialogOpen, setIsEditAssessmentDialogOpen] = useState(false);
  const [assessmentToEdit, setAssessmentToEdit] = useState<Penilaian | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assessmentToDeleteId, setAssessmentToDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: assessments, isLoading, isError, error } = useQuery<Penilaian[], Error>({
    queryKey: ['assessments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('penilaian')
        .select(`
          id,
          nama_penilaian,
          tanggal,
          jenis_penilaian,
          bentuk_penilaian,
          kode_tp,
          id_kelas,
          kelas (nama_kelas),
          id_kategori_bobot_akhir,
          kategori_bobot (nama_kategori),
          created_at
        `)
        .eq('kelas.id_guru', user.id)
        .order('tanggal', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  const handleAssessmentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['assessments', user?.id] });
  };

  const handleEditClick = (assessment: Penilaian) => {
    setAssessmentToEdit(assessment);
    setIsEditAssessmentDialogOpen(true);
  };

  const handleAssessmentUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['assessments', user?.id] });
  };

  const handleDeleteClick = (assessmentId: string) => {
    setAssessmentToDeleteId(assessmentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDeleteId) return;

    const { error } = await supabase
      .from('penilaian')
      .delete()
      .eq('id', assessmentToDeleteId);

    if (error) {
      showError("Gagal menghapus penilaian: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ['assessments', user?.id] });
    }
    setIsDeleteDialogOpen(false);
    setAssessmentToDeleteId(null);
  };

  if (isError) {
    showError("Gagal memuat penilaian: " + error?.message);
  }

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-assessmentsAccent-DEFAULT">Manajemen Penilaian</h1>
      <p className="text-lg text-muted-foreground">
        Buat dan kelola penilaian untuk kelas Anda, serta masukkan nilai siswa.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Daftar Penilaian</CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={() => navigate('/assessments/input-score')}
              className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
            >
              <ListChecks className="mr-2 h-4 w-4" /> Input Nilai
            </Button>
            <Button
              onClick={() => setIsAddAssessmentDialogOpen(true)}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Penilaian Baru
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
          ) : assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Penilaian</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Bentuk</TableHead>
                  <TableHead>Kode TP</TableHead>
                  <TableHead>Kategori Bobot</TableHead> {/* New column */}
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="font-medium">{assessment.nama_penilaian}</TableCell>
                    <TableCell>{assessment.kelas?.nama_kelas || 'N/A'}</TableCell>
                    <TableCell>{new Date(assessment.tanggal).toLocaleDateString()}</TableCell>
                    <TableCell>{assessment.jenis_penilaian}</TableCell>
                    <TableCell>{assessment.bentuk_penilaian}</TableCell>
                    <TableCell>{assessment.kode_tp || '-'}</TableCell>
                    <TableCell>{assessment.kategori_bobot?.nama_kategori || '-'}</TableCell> {/* Display category name */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:bg-primary/10"
                        onClick={() => handleEditClick(assessment)}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(assessment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Belum ada penilaian yang dibuat.</p>
          )}
        </CardContent>
      </Card>

      <AddAssessmentDialog
        isOpen={isAddAssessmentDialogOpen}
        onClose={() => setIsAddAssessmentDialogOpen(false)}
        onAssessmentAdded={handleAssessmentAdded}
      />

      {assessmentToEdit && (
        <EditAssessmentDialog
          isOpen={isEditAssessmentDialogOpen}
          onClose={() => setIsEditAssessmentDialogOpen(false)}
          onAssessmentUpdated={handleAssessmentUpdated}
          assessmentData={assessmentToEdit}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl shadow-mac-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus penilaian ini secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssessment}
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

export default Assessments;