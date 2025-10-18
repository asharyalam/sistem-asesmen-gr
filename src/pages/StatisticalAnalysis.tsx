"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Kelas } from '@/types/analysis';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import StatisticalAnalysisFilters from '@/components/analysis/StatisticalAnalysisFilters';
import DescriptiveAnalysisSection from '@/components/analysis/DescriptiveAnalysisSection';
import ComparativeAnalysisSection from '@/components/analysis/ComparativeAnalysisSection';
import RelationalAnalysisSection from '@/components/analysis/RelationalAnalysisSection';

const StatisticalAnalysis = () => {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState('descriptive');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTahunSemester, setSelectedTahunSemester] = useState<string | null>(null);

  // Fetch classes for the current user
  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<Kelas[], Error>({
    queryKey: ['classesForAnalysis', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tahun_semester')
        .eq('id_guru', user.id)
        .order('nama_kelas', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  // Extract unique tahun_semester values
  const uniqueTahunSemesters = useMemo(() => {
    if (!classes) return [];
    const semesters = Array.from(new Set(classes.map(c => c.tahun_semester)));
    return semesters.sort().reverse();
  }, [classes]);

  // Filter classes based on selectedTahunSemester
  const filteredClasses = useMemo(() => {
    if (!classes || !selectedTahunSemester) return [];
    return classes.filter(c => c.tahun_semester === selectedTahunSemester);
  }, [classes, selectedTahunSemester]);

  // Set initial selected class if available
  useEffect(() => {
    if (filteredClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(filteredClasses[0].id);
    } else if (filteredClasses.length === 0) {
      setSelectedClassId(null);
    }
  }, [filteredClasses, selectedClassId]);

  // Set initial selected tahun_semester if available
  useEffect(() => {
    if (uniqueTahunSemesters.length > 0 && !selectedTahunSemester) {
      setSelectedTahunSemester(uniqueTahunSemesters[0]);
    }
  }, [uniqueTahunSemesters, selectedTahunSemester]);

  // Error handling for main queries
  useEffect(() => {
    if (isErrorClasses) showError("Gagal memuat kelas: " + classesError?.message);
  }, [isErrorClasses, classesError]);

  const currentClass = classes?.find(c => c.id === selectedClassId);

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-dashboardAccent-DEFAULT">Analisis Statistik</h1>
      <p className="text-lg text-muted-foreground">
        Dapatkan wawasan mendalam tentang kinerja siswa dan pola kehadiran.
      </p>

      <StatisticalAnalysisFilters
        classes={classes}
        isLoadingClasses={isLoadingClasses}
        uniqueTahunSemesters={uniqueTahunSemesters}
        selectedTahunSemester={selectedTahunSemester}
        setSelectedTahunSemester={setSelectedTahunSemester}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        filteredClasses={filteredClasses}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl shadow-mac-sm">
          <TabsTrigger value="descriptive" className="rounded-lg">Analisis Deskriptif</TabsTrigger>
          <TabsTrigger value="comparative" className="rounded-lg">Analisis Perbandingan</TabsTrigger>
          <TabsTrigger value="relational" className="rounded-lg">Analisis Hubungan</TabsTrigger>
        </TabsList>

        <TabsContent value="descriptive" className="space-y-8 mt-6">
          <DescriptiveAnalysisSection
            selectedClassId={selectedClassId}
            currentClass={currentClass}
          />
        </TabsContent>

        <TabsContent value="comparative" className="space-y-8 mt-6">
          <ComparativeAnalysisSection
            filteredClasses={filteredClasses}
            classes={classes}
            activeTab={activeTab}
          />
        </TabsContent>

        <TabsContent value="relational" className="space-y-8 mt-6">
          <RelationalAnalysisSection
            classes={classes}
            activeTab={activeTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticalAnalysis;