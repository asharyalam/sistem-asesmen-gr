"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PlusCircle, Save, ChevronLeft, ListPlus } from 'lucide-react'; // Menambahkan ikon ListPlus
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import AddAspectDialog from '@/components/assessments/AddAspectDialog';
import AddMultipleAspectsDialog from '@/components/assessments/AddMultipleAspectsDialog'; // Import dialog baru
import { Badge } from '@/components/ui/badge';

interface Penilaian {
  id: string;
  nama_penilaian: string;
  id_kelas: string;
  kelas: {
    nama_kelas: string;
  };
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

interface NilaiSiswa {
  [studentId: string]: {
    [aspectId: string]: number | null;
  };
}

const ScoreInput = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [scores, setScores] = useState<NilaiSiswa>({});
  const [isAddAspectDialogOpen, setIsAddAspectDialogOpen] = useState(false);
  const [isAddMultipleAspectsDialogOpen, setIsAddMultipleAspectsDialogOpen] = useState(false); // State untuk dialog multiple aspek

  // Fetch all assessments for the current user
  const { data: assessments, isLoading: isLoadingAssessments, isError: isErrorAssessments, error: assessmentsError } = useQuery<Penilaian[], Error>({
    queryKey: ['allAssessments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('penilaian')
        .select(`
          id,
          nama_penilaian,
          id_kelas,
          kelas (nama_kelas)
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

  // Fetch aspects for the selected assessment
  const { data: aspects, isLoading: isLoadingAspects, isError: isErrorAspects, error: aspectsError } = useQuery<AspekPenilaian[], Error>({
    queryKey: ['assessmentAspects', selectedAssessmentId],
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

  // Get the class ID from the selected assessment
  const selectedClassId = assessments?.find(a => a.id === selectedAssessmentId)?.id_kelas;

  // Fetch students for the selected class
  const { data: students, isLoading: isLoadingStudents, isError: isErrorStudents, error: studentsError } = useQuery<Siswa[], Error>({
    queryKey: ['studentsForScoreInput', selectedClassId],
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

  // Fetch existing scores for the selected assessment, students, and aspects
  const { data: existingScores, isLoading: isLoadingExistingScores, isError: isErrorExistingScores, error: existingScoresError } = useQuery<{ id_siswa: string; id_aspek: string; skor_diperoleh: number }[], Error>({
    queryKey: ['existingScores', selectedAssessmentId, students, aspects],
    queryFn: async () => {
      if (!selectedAssessmentId || !students || students.length === 0 || !aspects || aspects.length === 0) return [];

      const studentIds = students.map(s => s.id);
      const aspectIds = aspects.map(a => a.id);

      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select('id_siswa, id_aspek, skor_diperoleh')
        .in('id_siswa', studentIds)
        .in('id_aspek', aspectIds);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedAssessmentId && !!students && students.length > 0 && !!aspects && aspects.length > 0,
  });

  useEffect(() => {
    if (existingScores && students && aspects) {
      const initialScores: NilaiSiswa = {};
      students.forEach(student => {
        initialScores[student.id] = {};
        aspects.forEach(aspect => {
          const score = existingScores.find(
            es => es.id_siswa === student.id && es.id_aspek === aspect.id
          );
          initialScores[student.id][aspect.id] = score ? score.skor_diperoleh : null;
        });
      });
      setScores(initialScores);
    } else {
      setScores({});
    }
  }, [existingScores, students, aspects]);

  const handleScoreChange = (studentId: string, aspectId: string, value: string) => {
    const scoreValue = value === '' ? null : parseInt(value, 10);
    setScores(prevScores => ({
      ...prevScores,
      [studentId]: {
        ...prevScores[studentId],
        [aspectId]: scoreValue,
      },
    }));
  };

  const handleSaveScores = async () => {
    if (!selectedAssessmentId || !students || !aspects) {
      showError("Penilaian, siswa, atau aspek belum dimuat.");
      return;
    }

    const updates: { id_siswa: string; id_aspek: string; skor_diperoleh: number }[] = [];
    const inserts: { id_siswa: string; id_aspek: string; skor_diperoleh: number }[] = [];

    for (const student of students) {
      for (const aspect of aspects) {
        const currentScore = scores[student.id]?.[aspect.id];
        const existingScoreEntry = existingScores?.find(es => es.id_siswa === student.id && es.id_aspek === aspect.id);

        if (currentScore !== null && currentScore !== undefined) {
          if (currentScore < 0 || currentScore > aspect.skor_maksimal) {
            showError(`Skor untuk ${student.nama_siswa} pada aspek ${aspect.deskripsi} harus antara 0 dan ${aspect.skor_maksimal}.`);
            return;
          }

          if (existingScoreEntry) {
            // Update if score changed
            if (existingScoreEntry.skor_diperoleh !== currentScore) {
              updates.push({ id_siswa: student.id, id_aspek: aspect.id, skor_diperoleh: currentScore });
            }
          } else {
            // Insert new score
            inserts.push({ id_siswa: student.id, id_aspek: aspect.id, skor_diperoleh: currentScore });
          }
        } else if (existingScoreEntry) {
          // If score is cleared but existed, delete it (Supabase doesn't allow null for NOT NULL columns)
          // For simplicity, we'll just not include it in updates/inserts if null.
          // A more robust solution would involve a separate delete operation.
        }
      }
    }

    try {
      if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('nilai_aspek_siswa').insert(inserts);
        if (insertError) throw insertError;
      }
      if (updates.length > 0) {
        // Supabase bulk update is tricky. We'll do individual updates for simplicity.
        // For large datasets, consider an Edge Function for bulk updates.
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('nilai_aspek_siswa')
            .update({ skor_diperoleh: update.skor_diperoleh })
            .eq('id_siswa', update.id_siswa)
            .eq('id_aspek', update.id_aspek);
          if (updateError) throw updateError;
        }
      }

      showSuccess("Nilai berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ['existingScores', selectedAssessmentId] }); // Refresh scores
    } catch (error: any) {
      showError("Gagal menyimpan nilai: " + error.message);
    }
  };

  if (isErrorAssessments) {
    showError("Gagal memuat penilaian: " + assessmentsError?.message);
  }
  if (isErrorAspects) {
    showError("Gagal memuat aspek penilaian: " + aspectsError?.message);
  }
  if (isErrorStudents) {
    showError("Gagal memuat siswa: " + studentsError?.message);
  }
  if (isErrorExistingScores) {
    showError("Gagal memuat nilai yang sudah ada: " + existingScoresError?.message);
  }

  const currentAssessment = assessments?.find(a => a.id === selectedAssessmentId);

  // Calculate max total score for the assessment
  const maxTotalScore = aspects?.reduce((sum, aspect) => sum + aspect.skor_maksimal, 0) || 0;

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/assessments')} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-4xl font-extrabold text-assessmentsAccent-DEFAULT">Input Nilai Siswa</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Pilih penilaian untuk mulai memasukkan atau mengedit nilai siswa.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pilih Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedAssessmentId} value={selectedAssessmentId || ""}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Penilaian" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingAssessments ? (
                <SelectItem value="loading" disabled>Memuat penilaian...</SelectItem>
              ) : assessments && assessments.length > 0 ? (
                assessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    {assessment.nama_penilaian} ({assessment.kelas?.nama_kelas})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-assessments" disabled>Tidak ada penilaian tersedia</SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAssessmentId && (
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Aspek Penilaian</CardTitle>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsAddMultipleAspectsDialogOpen(true)} // Tombol baru
                className="rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-mac-sm"
              >
                <ListPlus className="mr-2 h-4 w-4" /> Tambah Banyak Aspek
              </Button>
              <Button
                onClick={() => setIsAddAspectDialogOpen(true)}
                className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Aspek
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAspects ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ) : aspects && aspects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aspects.map(aspect => (
                  <Badge key={aspect.id} variant="secondary" className="rounded-md px-3 py-1 text-sm">
                    {aspect.deskripsi} (Max: {aspect.skor_maksimal})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Belum ada aspek penilaian untuk penilaian ini.</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedAssessmentId && students && students.length > 0 && aspects && aspects.length > 0 && (
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Input Nilai untuk {currentAssessment?.nama_penilaian} ({currentAssessment?.kelas?.nama_kelas})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents || isLoadingAspects || isLoadingExistingScores ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10">Nama Siswa (NIS/NISN)</TableHead>
                      {aspects.map(aspect => (
                        <TableHead key={aspect.id} className="min-w-[120px] text-center">
                          {aspect.deskripsi} (Max: {aspect.skor_maksimal})
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[100px] text-center">Total Skor</TableHead>
                      <TableHead className="min-w-[120px] text-center">Nilai Skala 100</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => {
                      const studentTotalScore = aspects.reduce((sum, aspect) => {
                        const score = scores[student.id]?.[aspect.id];
                        return sum + (score !== null && score !== undefined ? score : 0);
                      }, 0);

                      const convertedScore = maxTotalScore > 0 
                        ? ((studentTotalScore / maxTotalScore) * 100).toFixed(2)
                        : '0.00';

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium sticky left-0 bg-card z-10">
                            {student.nama_siswa} ({student.nis_nisn})
                          </TableCell>
                          {aspects.map(aspect => (
                            <TableCell key={aspect.id} className="text-center">
                              <Input
                                type="number"
                                value={scores[student.id]?.[aspect.id] ?? ''}
                                onChange={(e) => handleScoreChange(student.id, aspect.id, e.target.value)}
                                className="w-24 text-center rounded-lg"
                                min="0"
                                max={aspect.skor_maksimal}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold">
                            {studentTotalScore}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {convertedScore}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button
              onClick={handleSaveScores}
              className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
              disabled={isLoadingStudents || isLoadingAspects || isLoadingExistingScores}
            >
              <Save className="mr-2 h-4 w-4" /> Simpan Nilai
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedAssessmentId && (
        <AddAspectDialog
          isOpen={isAddAspectDialogOpen}
          onClose={() => {
            setIsAddAspectDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['assessmentAspects', selectedAssessmentId] }); // Refresh aspects after adding
          }}
          onAspectAdded={() => {}} // No specific action needed here, query invalidation handles refresh
          assessmentId={selectedAssessmentId}
        />
      )}

      {selectedAssessmentId && (
        <AddMultipleAspectsDialog
          isOpen={isAddMultipleAspectsDialogOpen}
          onClose={() => setIsAddMultipleAspectsDialogOpen(false)}
          onAspectsAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['assessmentAspects', selectedAssessmentId] }); // Refresh aspects after adding multiple
          }}
          assessmentId={selectedAssessmentId}
        />
      )}
    </div>
  );
};

export default ScoreInput;