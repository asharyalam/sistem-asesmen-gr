"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Legend } from 'recharts';
import { GitCompareArrows } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Kelas, Siswa, NilaiAspekSiswa } from '@/types/analysis';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { calculateClassAverage } from '@/utils/analysisUtils';
import { useSession } from '@/components/auth/SessionContextProvider';

const COMPARISON_COLORS = ['#8884d8', '#82ca9d']; // Colors for comparative bar chart

interface ComparativeAnalysisSectionProps {
  filteredClasses: Kelas[];
  classes: Kelas[] | undefined;
  activeTab: string;
}

const ComparativeAnalysisSection: React.FC<ComparativeAnalysisSectionProps> = ({
  filteredClasses,
  classes,
  activeTab,
}) => {
  const { user } = useSession();
  const [selectedComparisonClassId1, setSelectedComparisonClassId1] = useState<string | null>(null);
  const [selectedComparisonClassId2, setSelectedComparisonClassId2] = useState<string | null>(null);

  // Fetch students for Class 1
  const { data: studentsClass1, isLoading: isLoadingStudentsClass1, isError: isErrorStudentsClass1, error: studentsClass1Error } = useQuery<Siswa[], Error>({
    queryKey: ['studentsComparison1', selectedComparisonClassId1],
    queryFn: async () => {
      if (!selectedComparisonClassId1) return [];
      const { data, error } = await supabase
        .from('siswa')
        .select('id, nama_siswa, nis_nisn')
        .eq('id_kelas', selectedComparisonClassId1)
        .order('nama_siswa', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId1 && activeTab === 'comparative',
  });

  // Fetch students for Class 2
  const { data: studentsClass2, isLoading: isLoadingStudentsClass2, isError: isErrorStudentsClass2, error: studentsClass2Error } = useQuery<Siswa[], Error>({
    queryKey: ['studentsComparison2', selectedComparisonClassId2],
    queryFn: async () => {
      if (!selectedComparisonClassId2) return [];
      const { data, error } = await supabase
        .from('siswa')
        .select('id, nama_siswa, nis_nisn')
        .eq('id_kelas', selectedComparisonClassId2)
        .order('nama_siswa', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId2 && activeTab === 'comparative',
  });

  const { data: comparisonScores1, isLoading: isLoadingComparisonScores1, isError: isErrorComparisonScores1, error: comparisonScores1Error } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['comparisonScores1', selectedComparisonClassId1],
    queryFn: async () => {
      if (!selectedComparisonClassId1) return [];
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          skor_diperoleh,
          aspek_penilaian (skor_maksimal, id_penilaian),
          penilaian (id)
        `)
        .eq('penilaian.id_kelas', selectedComparisonClassId1);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId1 && activeTab === 'comparative',
  });

  const { data: comparisonScores2, isLoading: isLoadingComparisonScores2, isError: isErrorComparisonScores2, error: comparisonScores2Error } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['comparisonScores2', selectedComparisonClassId2],
    queryFn: async () => {
      if (!selectedComparisonClassId2) return [];
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          skor_diperoleh,
          aspek_penilaian (skor_maksimal, id_penilaian),
          penilaian (id)
        `)
        .eq('penilaian.id_kelas', selectedComparisonClassId2);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId2 && activeTab === 'comparative',
  });

  useEffect(() => {
    if (isErrorStudentsClass1) showError("Gagal memuat siswa kelas 1: " + studentsClass1Error?.message);
    if (isErrorStudentsClass2) showError("Gagal memuat siswa kelas 2: " + studentsClass2Error?.message);
    if (isErrorComparisonScores1) showError("Gagal memuat nilai kelas 1: " + comparisonScores1Error?.message);
    if (isErrorComparisonScores2) showError("Gagal memuat nilai kelas 2: " + comparisonScores2Error?.message);
  }, [isErrorStudentsClass1, studentsClass1Error, isErrorStudentsClass2, studentsClass2Error, isErrorComparisonScores1, comparisonScores1Error, isErrorComparisonScores2, comparisonScores2Error]);

  const comparativeAnalysisData = useMemo(() => {
    if (!comparisonScores1 || !comparisonScores2 || !classes || !studentsClass1 || !studentsClass2) return [];

    const avg1 = calculateClassAverage(comparisonScores1, studentsClass1);
    const avg2 = calculateClassAverage(comparisonScores2, studentsClass2);

    const className1 = classes.find(c => c.id === selectedComparisonClassId1)?.nama_kelas || 'Kelas 1';
    const className2 = classes.find(c => c.id === selectedComparisonClassId2)?.nama_kelas || 'Kelas 2';

    return [
      { name: className1, averageScore: parseFloat(avg1.toFixed(2)) },
            { name: className2, averageScore: parseFloat(avg2.toFixed(2)) },
    ];
  }, [comparisonScores1, comparisonScores2, selectedComparisonClassId1, selectedComparisonClassId2, classes, studentsClass1, studentsClass2]);

  return (
    <Card className="rounded-xl shadow-mac-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Perbandingan Kinerja Antar Kelas</CardTitle>
        <GitCompareArrows className="h-5 w-5 text-orange-500" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Select onValueChange={setSelectedComparisonClassId1} value={selectedComparisonClassId1 || ""}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Kelas Pertama" />
            </SelectTrigger>
            <SelectContent>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((kelas) => (
                  <SelectItem key={kelas.id} value={kelas.id}>
                    {kelas.nama_kelas}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-classes" disabled>Tidak ada kelas tersedia</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedComparisonClassId2} value={selectedComparisonClassId2 || ""}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Kelas Kedua" />
            </SelectTrigger>
            <SelectContent>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((kelas) => (
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

        {(selectedComparisonClassId1 && selectedComparisonClassId2) ? (
          isLoadingComparisonScores1 || isLoadingComparisonScores2 || isLoadingStudentsClass1 || isLoadingStudentsClass2 ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : comparativeAnalysisData.length > 0 ? (
            <>
              <h3 className="text-md font-medium mb-2">Rata-rata Skor Kelas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={comparativeAnalysisData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-sm" />
                  <YAxis domain={[0, 100]} className="text-sm" />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                  <Legend />
                  <Bar dataKey="averageScore" fill={COMPARISON_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-muted-foreground">Tidak ada data nilai untuk kelas yang dipilih.</p>
          )
        ) : (
          <p className="text-muted-foreground">Pilih dua kelas untuk membandingkan kinerja.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ComparativeAnalysisSection;