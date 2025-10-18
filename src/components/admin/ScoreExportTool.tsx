"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/auth/SessionContextProvider';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface Penilaian {
  id: string;
  nama_penilaian: string;
  id_kelas: string;
  tanggal: string;
}

interface AspekPenilaian {
  id: string;
  deskripsi: string;
  skor_maksimal: number;
  urutan: number;
}

interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
}

interface NilaiAspekSiswa {
  id_siswa: string;
  id_aspek: string;
  skor_diperoleh: number;
}

const ScoreExportTool = () => {
  const { user } = useSession();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch classes for the current user
  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<Kelas[], Error>({
    queryKey: ['classesForExport', user?.id],
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

  // Fetch assessments for the selected class
  const { data: assessments, isLoading: isLoadingAssessments, isError: isErrorAssessments, error: assessmentsError } = useQuery<Penilaian[], Error>({
    queryKey: ['assessmentsForExport', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('penilaian')
        .select('id, nama_penilaian, id_kelas, tanggal')
        .eq('id_kelas', selectedClassId)
        .order('tanggal', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch students for the selected class
  const { data: students, isLoading: isLoadingStudents, isError: isErrorStudents, error: studentsError } = useQuery<Siswa[], Error>({
    queryKey: ['studentsForExport', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('siswa')
        .select('id, nama_siswa, nis_nisn')
        .eq('id_kelas', selectedClassId)
        .order('nama_siswa', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch aspects for the selected assessment
  const { data: aspects, isLoading: isLoadingAspects, isError: isErrorAspects, error: aspectsError } = useQuery<AspekPenilaian[], Error>({
    queryKey: ['aspectsForExport', selectedAssessmentId],
    queryFn: async () => {
      if (!selectedAssessmentId) return [];
      const { data, error } = await supabase
        .from('aspek_penilaian')
        .select('id, deskripsi, skor_maksimal, urutan')
        .eq('id_penilaian', selectedAssessmentId)
        .order('urutan', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedAssessmentId,
  });

  // Fetch scores for the selected assessment and its aspects
  const { data: scores, isLoading: isLoadingScores, isError: isErrorScores, error: scoresError } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['scoresForExport', selectedAssessmentId],
    queryFn: async () => {
      if (!selectedAssessmentId || !aspects || aspects.length === 0) return [];
      const aspectIds = aspects.map(a => a.id);
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select('id_siswa, id_aspek, skor_diperoleh')
        .in('id_aspek', aspectIds);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedAssessmentId && !!aspects && aspects.length > 0,
  });

  if (isErrorClasses) showError("Gagal memuat kelas: " + classesError?.message);
  if (isErrorAssessments) showError("Gagal memuat penilaian: " + assessmentsError?.message);
  if (isErrorStudents) showError("Gagal memuat siswa: " + studentsError?.message);
  if (isErrorAspects) showError("Gagal memuat aspek penilaian: " + aspectsError?.message);
  if (isErrorScores) showError("Gagal memuat nilai: " + scoresError?.message);

  const handleExport = async () => {
    if (!selectedClassId || !selectedAssessmentId || !students || students.length === 0 || !aspects || aspects.length === 0 || !scores) {
      showError("Pilih kelas dan penilaian, dan pastikan ada data yang tersedia.");
      return;
    }

    setIsExporting(true);
    try {
      const currentClass = classes?.find(c => c.id === selectedClassId);
      const currentAssessment = assessments?.find(a => a.id === selectedAssessmentId);

      if (!currentClass || !currentAssessment) {
        showError("Kelas atau penilaian tidak ditemukan.");
        return;
      }

      const headerRow = ['Nama Siswa', 'NIS/NISN'];
      aspects.forEach(aspect => {
        headerRow.push(`${aspect.deskripsi} (Max: ${aspect.skor_maksimal})`);
      });
      headerRow.push('Total Skor', 'Nilai Skala 100');

      const dataRows: any[] = [];
      const maxTotalScore = aspects.reduce((sum, aspect) => sum + aspect.skor_maksimal, 0);

      students.forEach(student => {
        const studentRow: any[] = [student.nama_siswa, student.nis_nisn];
        let studentTotalScore = 0;

        aspects.forEach(aspect => {
          const studentAspectScore = scores.find(
            s => s.id_siswa === student.id && s.id_aspek === aspect.id
          );
          const score = studentAspectScore ? studentAspectScore.skor_diperoleh : 0;
          studentRow.push(score);
          studentTotalScore += score;
        });

        const convertedScore = maxTotalScore > 0 ? ((studentTotalScore / maxTotalScore) * 100).toFixed(2) : '0.00';
        studentRow.push(studentTotalScore, convertedScore);
        dataRows.push(studentRow);
      });

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Nilai Siswa");

      const fileName = `Nilai_${currentClass.nama_kelas}_${currentAssessment.nama_penilaian}_${currentAssessment.tanggal}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showSuccess("Nilai berhasil diekspor ke Excel!");
    } catch (error: any) {
      showError("Gagal mengekspor nilai: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const isDataReadyForExport = selectedClassId && selectedAssessmentId && students && students.length > 0 && aspects && aspects.length > 0 && scores && scores.length > 0;

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <label htmlFor="select-class" className="text-sm font-medium">Pilih Kelas</label>
        <Select onValueChange={(value) => { setSelectedClassId(value); setSelectedAssessmentId(null); }} value={selectedClassId || ""}>
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
      </div>

      <div className="grid gap-2">
        <label htmlFor="select-assessment" className="text-sm font-medium">Pilih Penilaian</label>
        <Select onValueChange={setSelectedAssessmentId} value={selectedAssessmentId || ""}>
          <SelectTrigger className="w-full rounded-lg" disabled={!selectedClassId || isLoadingAssessments}>
            <SelectValue placeholder="Pilih Penilaian" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingAssessments ? (
              <SelectItem value="loading" disabled>Memuat penilaian...</SelectItem>
            ) : assessments && assessments.length > 0 ? (
              assessments.map((assessment) => (
                <SelectItem key={assessment.id} value={assessment.id}>
                  {assessment.nama_penilaian} ({new Date(assessment.tanggal).toLocaleDateString()})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-assessments" disabled>Tidak ada penilaian tersedia untuk kelas ini</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleExport}
        disabled={!isDataReadyForExport || isExporting || isLoadingStudents || isLoadingAspects || isLoadingScores}
        className="mt-4 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
      >
        <Download className="mr-2 h-4 w-4" /> {isExporting ? "Mengekspor..." : "Ekspor Nilai ke Excel"}
      </Button>

      {!isDataReadyForExport && selectedClassId && selectedAssessmentId && (
        <p className="text-sm text-muted-foreground mt-2">
          Memuat data siswa, aspek, dan nilai...
          {(isLoadingStudents || isLoadingAspects || isLoadingScores) && <Skeleton className="h-4 w-1/2 mt-1" />}
        </p>
      )}
      {!selectedClassId && (
        <p className="text-sm text-muted-foreground mt-2">
          Pilih kelas terlebih dahulu untuk melihat penilaian.
        </p>
      )}
      {selectedClassId && !selectedAssessmentId && (
        <p className="text-sm text-muted-foreground mt-2">
          Pilih penilaian untuk kelas yang dipilih.
        </p>
      )}
    </div>
  );
};

export default ScoreExportTool;