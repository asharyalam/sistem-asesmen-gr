"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Scale } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Kelas, Penilaian, AspekPenilaian, NilaiAspekSiswa } from '@/types/analysis';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/auth/SessionContextProvider';
import AnalysisInterpretationCard from './AnalysisInterpretationCard'; // Import komponen baru

const RELATION_COLORS = ['#ffc658', '#83a6ed']; // Colors for relational scatter plot

interface RelationalAnalysisSectionProps {
  classes: Kelas[] | undefined;
  activeTab: string;
}

const RelationalAnalysisSection: React.FC<RelationalAnalysisSectionProps> = ({
  classes,
  activeTab,
}) => {
  const { user } = useSession();
  const [selectedRelationAssessmentId, setSelectedRelationAssessmentId] = useState<string | null>(null);
  const [selectedRelationAspectId1, setSelectedRelationAspectId1] = useState<string | null>(null);
  const [selectedRelationAspectId2, setSelectedRelationAspectId2] = useState<string | null>(null);

  // Fetch all assessments for the user's classes
  const { data: allAssessments, isLoading: isLoadingAllAssessments, isError: isErrorAllAssessments, error: allAssessmentsError } = useQuery<Penilaian[], Error>({
    queryKey: ['allAssessmentsForRelation', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('penilaian')
        .select(`
          id,
          nama_penilaian,
          id_kelas,
          kelas (id_guru)
        `)
        .eq('kelas.id_guru', user.id)
        .order('nama_penilaian', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user && activeTab === 'relational',
  });

  // Fetch aspects for the selected relational assessment
  const { data: relationAspects, isLoading: isLoadingRelationAspects, isError: isErrorRelationAspects, error: relationAspectsError } = useQuery<AspekPenilaian[], Error>({
    queryKey: ['relationAspects', selectedRelationAssessmentId],
    queryFn: async () => {
      if (!selectedRelationAssessmentId) return [];
      const { data, error } = await supabase
        .from('aspek_penilaian')
        .select('id, deskripsi, skor_maksimal, id_penilaian')
        .eq('id_penilaian', selectedRelationAssessmentId)
        .order('urutan', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedRelationAssessmentId && activeTab === 'relational',
  });

  // Fetch scores for relational analysis (two selected aspects)
  const { data: relationScores, isLoading: isLoadingRelationScores, isError: isErrorRelationScores, error: relationScoresError } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['relationScores', selectedRelationAssessmentId, selectedRelationAspectId1, selectedRelationAspectId2],
    queryFn: async () => {
      if (!selectedRelationAssessmentId || !selectedRelationAspectId1 || !selectedRelationAspectId2) return [];

      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          id_aspek,
          skor_diperoleh,
          aspek_penilaian (deskripsi, skor_maksimal, id_penilaian)
        `)
        .in('id_aspek', [selectedRelationAspectId1, selectedRelationAspectId2])
        .eq('aspek_penilaian.id_penilaian', selectedRelationAssessmentId);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedRelationAssessmentId && !!selectedRelationAspectId1 && !!selectedRelationAspectId2 && activeTab === 'relational',
  });

  useEffect(() => {
    if (isErrorAllAssessments) showError("Gagal memuat penilaian: " + allAssessmentsError?.message);
    if (isErrorRelationAspects) showError("Gagal memuat aspek penilaian: " + relationAspectsError?.message);
    if (isErrorRelationScores) showError("Gagal memuat nilai hubungan: " + relationScoresError?.message);
  }, [isErrorAllAssessments, allAssessmentsError, isErrorRelationAspects, relationAspectsError, isErrorRelationScores, relationScoresError]);

  const relationalAnalysisData = useMemo(() => {
    if (!relationScores || relationScores.length === 0 || !selectedRelationAspectId1 || !selectedRelationAspectId2) return [];

    const dataMap = new Map<string, { score1: number | null; score2: number | null }>();

    relationScores.forEach(score => {
      const studentId = score.id_siswa;
      if (!dataMap.has(studentId)) {
        dataMap.set(studentId, { score1: null, score2: null });
      }
      const studentData = dataMap.get(studentId)!;

      if (score.id_aspek === selectedRelationAspectId1) {
        studentData.score1 = score.skor_diperoleh;
      } else if (score.id_aspek === selectedRelationAspectId2) {
        studentData.score2 = score.skor_diperoleh;
      }
      dataMap.set(studentId, studentData);
    });

    return Array.from(dataMap.values())
      .filter(d => d.score1 !== null && d.score2 !== null)
      .map(d => ({ x: d.score1, y: d.score2 }));
  }, [relationScores, selectedRelationAspectId1, selectedRelationAspectId2]);

  const currentRelationAssessment = allAssessments?.find(a => a.id === selectedRelationAssessmentId);
  const currentRelationAspect1 = relationAspects?.find(a => a.id === selectedRelationAspectId1);
  const currentRelationAspect2 = relationAspects?.find(a => a.id === selectedRelationAspectId2);

  return (
    <Card className="rounded-xl shadow-mac-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Analisis Hubungan Antar Aspek Penilaian</CardTitle>
        <Scale className="h-5 w-5 text-red-500" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 mb-4">
          <Select onValueChange={setSelectedRelationAssessmentId} value={selectedRelationAssessmentId || ""}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Penilaian" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingAllAssessments ? (
                <SelectItem value="loading" disabled>Memuat penilaian...</SelectItem>
              ) : allAssessments && allAssessments.length > 0 ? (
                allAssessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    {assessment.nama_penilaian} ({classes?.find(c => c.id === assessment.id_kelas)?.nama_kelas})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-assessments" disabled>Tidak ada penilaian tersedia</SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedRelationAssessmentId && (
            <div className="grid gap-4 md:grid-cols-2">
              <Select onValueChange={setSelectedRelationAspectId1} value={selectedRelationAspectId1 || ""}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Pilih Aspek Pertama (X-Axis)" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingRelationAspects ? (
                    <SelectItem value="loading" disabled>Memuat aspek...</SelectItem>
                  ) : relationAspects && relationAspects.length > 0 ? (
                    relationAspects.map((aspect) => (
                      <SelectItem key={aspect.id} value={aspect.id}>
                        {aspect.deskripsi} (Max: {aspect.skor_maksimal})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-aspects" disabled>Tidak ada aspek tersedia</SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Select onValueChange={setSelectedRelationAspectId2} value={selectedRelationAspectId2 || ""}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Pilih Aspek Kedua (Y-Axis)" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingRelationAspects ? (
                    <SelectItem value="loading" disabled>Memuat aspek...</SelectItem>
                  ) : relationAspects && relationAspects.length > 0 ? (
                    relationAspects.map((aspect) => (
                      <SelectItem key={aspect.id} value={aspect.id}>
                        {aspect.deskripsi} (Max: {aspect.skor_maksimal})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-aspects" disabled>Tidak ada aspek tersedia</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {(selectedRelationAssessmentId && selectedRelationAspectId1 && selectedRelationAspectId2) ? (
          isLoadingRelationScores ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : relationalAnalysisData.length > 0 ? (
            <>
              <h3 className="text-md font-medium mb-2">Hubungan antara {currentRelationAspect1?.deskripsi} dan {currentRelationAspect2?.deskripsi}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid className="stroke-border" />
                  <XAxis type="number" dataKey="x" name={currentRelationAspect1?.deskripsi} unit="" />
                  <YAxis type="number" dataKey="y" name={currentRelationAspect2?.deskripsi} unit="" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="Siswa" data={relationalAnalysisData} fill={RELATION_COLORS[0]} />
                </ScatterChart>
              </ResponsiveContainer>

              {/* New: Interpretation Card */}
              <div className="mt-6">
                <AnalysisInterpretationCard
                  title="Interpretasi Analisis Hubungan (Scatter Plot)"
                  description="Scatter plot ini menunjukkan bagaimana skor siswa pada dua aspek penilaian saling berhubungan. Setiap titik mewakili satu siswa, dengan posisi X adalah skor pada aspek pertama dan posisi Y adalah skor pada aspek kedua."
                  interpretationPoints={[
                    {
                      title: "Korelasi Positif",
                      description: "Jika titik-titik cenderung naik dari kiri bawah ke kanan atas, berarti siswa yang mendapat skor tinggi pada satu aspek juga cenderung mendapat skor tinggi pada aspek lainnya. Ini menunjukkan kedua aspek mungkin mengukur kemampuan yang serupa atau saling mendukung."
                    },
                    {
                      title: "Korelasi Negatif",
                      description: "Jika titik-titik cenderung turun dari kiri atas ke kanan bawah, berarti siswa yang mendapat skor tinggi pada satu aspek cenderung mendapat skor rendah pada aspek lainnya. Ini jarang terjadi pada penilaian yang baik, tetapi bisa menunjukkan aspek-aspek yang bertentangan atau salah satu aspek terlalu sulit/mudah."
                    },
                    {
                      title: "Tidak Ada Korelasi",
                      description: "Jika titik-titik tersebar secara acak tanpa pola yang jelas, berarti tidak ada hubungan yang signifikan antara skor pada kedua aspek. Ini menunjukkan kedua aspek mungkin mengukur kemampuan yang berbeda secara independen."
                    },
                    {
                      title: "Kekuatan Korelasi",
                      description: "Semakin rapat titik-titik membentuk garis, semakin kuat korelasinya. Semakin menyebar, semakin lemah korelasinya."
                    }
                  ]}
                />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Tidak ada data nilai untuk aspek yang dipilih dalam penilaian ini.</p>
          )
        ) : (
          <p className="text-muted-foreground">Pilih penilaian dan dua aspek untuk melihat hubungan.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RelationalAnalysisSection;