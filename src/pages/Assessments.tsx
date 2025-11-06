"use client";

import React, { useState } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ClipboardList, Edit, Trash2, ListChecks, Settings, Download } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Import Dialog components
import { useNavigate } from 'react-router-dom';
import { logActivity } from '@/utils/activityLogger';
import ScoreExportTool from '@/components/admin/ScoreExportTool'; // Import ScoreExportTool
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  }[] | null; // Updated type
  id_kategori_bobot_akhir: string | null;
  kategori_bobot: {
    nama_kategori: string;
  }[] | null; // Updated type
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
  const [assessmentToDeleteName, setAssessmentToDeleteName] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false); // State for export dialog
  const queryClient = useQueryClient();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page
  const [totalItems, setTotalItems] = useState(0);

  const { data: assessments, isLoading, isError, error } = useQuery<Penilaian[], Error>({
    queryKey: ['assessments', user?.id, currentPage], // Add currentPage to queryKey
    queryFn: async () => {
      if (!user) return [];
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      const { data, error, count } = await supabase
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
        `, { count: 'exact' })
        .eq('kelas.id_guru', user.id)
        .order('tanggal', { ascending: false })
        .range(startIndex, endIndex); // Apply range for pagination

      if (error) {
        throw new Error(error.message);
      }
      setTotalItems(count || 0); // Update total items for pagination
      console.log("Fetched assessments data:", data); // Log data here
      return data as Penilaian[] || []; // Explicitly cast data to Penilaian[]
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

  const handleDeleteClick = (assessmentId: string, assessmentName: string) => {
    setAssessmentToDeleteId(assessmentId);
    setAssessmentToDeleteName(assessmentName);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAssessment = async () => {
    if (!assessmentToDeleteId || !user) return;

    const { error } = await supabase
      .from('penilaian')
      .delete()
      .eq('id', assessmentToDeleteId);

    if (error) {
      showError("Gagal menghapus penilaian: " + error.message);
    } else {
      await logActivity(user, 'ASSESSMENT_DELETED', `Menghapus penilaian: ${assessmentToDeleteName}`, queryClient);
      queryClient.invalidateQueries({ queryKey: ['assessments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['totalAssessments', user.id] });
    }
    setIsDeleteDialogOpen(false);
    setAssessmentToDeleteId(null);
    setAssessmentToDeleteName(null);
  };

  if (isError) {
    showError("Gagal memuat penilaian: " + error?.message);
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

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
              onClick={() => navigate('/weight-settings')}
              className="rounded-lg bg-primary text-white hover:bg-primary/90 shadow-mac-sm"
            >
              <Settings className="mr-2 h-4 w-4" /> Pengaturan Bobot
            </Button>
            <Button
              onClick={() => navigate('/assessments/input-score')}
              className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
            >
              <ListChecks className="mr-2 h-4 w-4" /> Input Nilai
            </Button>
            <Button
              onClick={() => setIsExportDialogOpen(true)} // Open export dialog
              className="rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-mac-sm" // New button for export
            >
              <Download className="mr-2 h-4 w-4" /> Ekspor Nilai
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Penilaian</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Bentuk</TableHead>
                    <TableHead>Kode TP</TableHead>
                    <TableHead>Kategori Bobot</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.nama_penilaian}</TableCell>
                      <TableCell>{assessment.kelas?.[0]?.nama_kelas || 'N/A'}</TableCell>
                      <TableCell>{new Date(assessment.tanggal).toLocaleDateString()}</TableCell>
                      <TableCell>{assessment.jenis_penilaian}</TableCell>
                      <TableCell>{assessment.bentuk_penilaian}</TableCell>
                      <TableCell>{assessment.kode_tp || '-'}</TableCell>
                      <TableCell>{assessment.kategori_bobot?.[0]?.nama_kategori || '-'}</TableCell>
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
                          onClick={() => handleDeleteClick(assessment.id, assessment.nama_penilaian)}
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
                        aria-disabled={currentPage === 1}
                        tabIndex={currentPage === 1 ? -1 : undefined}
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
                        aria-disabled={currentPage === totalPages}
                        tabIndex={currentPage === totalPages ? -1 : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
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

      {/* Export Scores Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl shadow-mac-lg">
          <DialogHeader>
            <DialogTitle>Ekspor Nilai ke Excel</DialogTitle>
            <DialogDescription>
              Pilih kelas dan penilaian untuk mengekspor data nilai siswa ke file Excel.
            </DialogDescription>
          </DialogHeader>
          <ScoreExportTool />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assessments;