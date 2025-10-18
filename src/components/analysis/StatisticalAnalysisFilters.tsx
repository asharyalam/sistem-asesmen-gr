"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Kelas } from '@/types/analysis';
import { Skeleton } from '@/components/ui/skeleton';

interface StatisticalAnalysisFiltersProps {
  classes: Kelas[] | undefined;
  isLoadingClasses: boolean;
  uniqueTahunSemesters: string[];
  selectedTahunSemester: string | null;
  setSelectedTahunSemester: (value: string) => void;
  selectedClassId: string | null;
  setSelectedClassId: (value: string) => void;
  filteredClasses: Kelas[];
}

const StatisticalAnalysisFilters: React.FC<StatisticalAnalysisFiltersProps> = ({
  classes,
  isLoadingClasses,
  uniqueTahunSemesters,
  selectedTahunSemester,
  setSelectedTahunSemester,
  selectedClassId,
  setSelectedClassId,
  filteredClasses,
}) => {
  return (
    <Card className="rounded-xl shadow-mac-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Pilih Filter Utama</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Select onValueChange={setSelectedTahunSemester} value={selectedTahunSemester || ""}>
          <SelectTrigger className="w-full rounded-lg">
            <SelectValue placeholder="Pilih Tahun/Semester" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingClasses ? (
              <SelectItem value="loading" disabled>Memuat tahun/semester...</SelectItem>
            ) : uniqueTahunSemesters.length > 0 ? (
              uniqueTahunSemesters.map((ts) => (
                <SelectItem key={ts} value={ts}>
                  {ts}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-semesters" disabled>Tidak ada tahun/semester tersedia</SelectItem>
            )}
          </SelectContent>
        </Select>

        <Select onValueChange={setSelectedClassId} value={selectedClassId || ""}>
          <SelectTrigger className="w-full rounded-lg">
            <SelectValue placeholder="Pilih Kelas" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingClasses ? (
              <SelectItem value="loading" disabled>Memuat kelas...</SelectItem>
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((kelas) => (
                <SelectItem key={kelas.id} value={kelas.id}>
                  {kelas.nama_kelas}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-classes" disabled>Tidak ada kelas tersedia untuk semester ini</SelectItem>
            )}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export default StatisticalAnalysisFilters;