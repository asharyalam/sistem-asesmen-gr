"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ScatterChart, Scatter } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, BookOpen, CalendarCheck, Scale, GitCompareArrows } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Kelas {
  id: string;
  nama_kelas: string;
  tahun_semester: string;
}

interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
}

interface Penilaian {
  id: string;
  nama_penilaian: string;
  tanggal: string;
  jenis_penilaian: string;
  bentuk_penilaian: string;
  id_kelas: string;
}

interface AspekPenilaian {
  id: string;
  deskripsi: string;
  skor_maksimal: number;
  urutan: number;
}

interface NilaiAspekSiswa {
  id_siswa: string;
  id_aspek: string;
  skor_diperoleh: number;
  aspek_penilaian: AspekPenilaian;
  penilaian: Penilaian;
}

interface KehadiranRecord {
  id_siswa: string;
  tanggal_pertemuan: string;
  status_kehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']; // Colors for attendance pie chart
const COMPARISON_COLORS = ['#8884d8', '#82ca9d']; // Colors for comparative bar chart
const RELATION_COLORS = ['#ffc658', '#83a6ed']; // Colors for relational scatter plot

const StatisticalAnalysis = () => {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState('descriptive');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTahunSemester, setSelectedTahunSemester] = useState<string | null>(null);
  const [selectedStudentIdForTrend, setSelectedStudentIdForTrend] = useState<string | null>(null);

  // State for Comparative Analysis
  const [selectedComparisonClassId1, setSelectedComparisonClassId1] = useState<string | null>(null);
  const [selectedComparisonClassId2, setSelectedComparisonClassId2] = useState<string | null>(null);

  // State for Relational Analysis
  const [selectedRelationAssessmentId, setSelectedRelationAssessmentId] = useState<string | null>(null);
  const [selectedRelationAspectId1, setSelectedRelationAspectId1] = useState<string | null>(null);
  const [selectedRelationAspectId2, setSelectedRelationAspectId2] = useState<string | null>(null);

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
    return semesters.sort().reverse(); // Sort descending for most recent first
  }, [classes]);

  // Filter classes based on selectedTahunSemester
  const filteredClasses = useMemo(() => {
    if (!classes || !selectedTahunSemester) return [];
    return classes.filter(c => c.tahun_semester === selectedTahunSemester);
  }, [classes, selectedTahunSemester]);

  // Fetch students for the selected class
  const { data: students, isLoading: isLoadingStudents, isError: isErrorStudents, error: studentsError } = useQuery<Siswa[], Error>({
    queryKey: ['studentsForAnalysis', selectedClassId],
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

  // Fetch all assessment scores and details for the selected class
  const { data: allScores, isLoading: isLoadingAllScores, isError: isErrorAllScores, error: allScoresError } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['allScoresForAnalysis', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          id_aspek,
          skor_diperoleh,
          aspek_penilaian (deskripsi, skor_maksimal, urutan),
          penilaian (id, nama_penilaian, tanggal, jenis_penilaian, bentuk_penilaian, id_kelas)
        `)
        .eq('penilaian.id_kelas', selectedClassId)
        .order('penilaian.tanggal', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch attendance records for the selected class
  const { data: attendanceRecords, isLoading: isLoadingAttendance, isError: isErrorAttendance, error: attendanceError } = useQuery<KehadiranRecord[], Error>({
    queryKey: ['attendanceRecordsForAnalysis', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId || !students || students.length === 0) return [];
      const studentIds = students.map(s => s.id);
      const { data, error } = await supabase
        .from('kehadiran')
        .select('id_siswa, tanggal_pertemuan, status_kehadiran')
        .in('id_siswa', studentIds)
        .order('tanggal_pertemuan', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId && !!students && students.length > 0,
  });

  // Fetch assessments for relational analysis (all assessments for the user's classes)
  const { data: allAssessments, isLoading: isLoadingAllAssessments } = useQuery<Penilaian[], Error>({
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
  const { data: relationAspects, isLoading: isLoadingRelationAspects } = useQuery<AspekPenilaian[], Error>({
    queryKey: ['relationAspects', selectedRelationAssessmentId],
    queryFn: async () => {
      if (!selectedRelationAssessmentId) return [];
      const { data, error } = await supabase
        .from('aspek_penilaian')
        .select('id, deskripsi, skor_maksimal')
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
  const { data: relationScores, isLoading: isLoadingRelationScores } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['relationScores', selectedRelationAssessmentId, selectedRelationAspectId1, selectedRelationAspectId2],
    queryFn: async () => {
      if (!selectedRelationAssessmentId || !selectedRelationAspectId1 || !selectedRelationAspectId2) return [];

      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          id_aspek,
          skor_diperoleh,
          aspek_penilaian (deskripsi, skor_maksimal)
        `)
        .in('id_aspek', [selectedRelationAspectId1, selectedRelationAspectId2])
        .eq('penilaian.id', selectedRelationAssessmentId); // Ensure scores are from the selected assessment

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedRelationAssessmentId && !!selectedRelationAspectId1 && !!selectedRelationAspectId2 && activeTab === 'relational',
  });

  // --- Data Processing ---

  // 1. Overall Class Performance (Descriptive)
  const classPerformanceSummary = useMemo(() => {
    if (!allScores || allScores.length === 0 || !students || students.length === 0) return null;

    const studentTotalScores: { [studentId: string]: { total: number; count: number } } = {};
    const assessmentMaxScores: { [assessmentId: string]: number } = {};

    allScores.forEach(score => {
      const assessmentId = score.penilaian.id;
      const aspectMaxScore = score.aspek_penilaian.skor_maksimal;

      if (!assessmentMaxScores[assessmentId]) {
        assessmentMaxScores[assessmentId] = 0;
      }
      assessmentMaxScores[assessmentId] += aspectMaxScore; // Sum max scores for all aspects in an assessment

      if (!studentTotalScores[score.id_siswa]) {
        studentTotalScores[score.id_siswa] = { total: 0, count: 0 };
      }
      studentTotalScores[score.id_siswa].total += score.skor_diperoleh;
      studentTotalScores[score.id_siswa].count++;
    });

    const studentAverages: { studentId: string; average: number; nama_siswa: string }[] = [];
    students.forEach(student => {
      if (studentTotalScores[student.id] && studentTotalScores[student.id].count > 0) {
        // Calculate average as a percentage of max possible score for each assessment, then average those percentages
        let totalPercentage = 0;
        let assessmentCount = 0;
        const scoresByAssessmentForStudent = allScores.filter(s => s.id_siswa === student.id);
        const groupedByAssessment = scoresByAssessmentForStudent.reduce((acc, score) => {
          if (!acc[score.penilaian.id]) {
            acc[score.penilaian.id] = { studentScore: 0, maxScore: 0 };
          }
          acc[score.penilaian.id].studentScore += score.skor_diperoleh;
          acc[score.penilaian.id].maxScore += score.aspek_penilaian.skor_maksimal;
          return acc;
        }, {} as { [key: string]: { studentScore: number; maxScore: number } });

        Object.values(groupedByAssessment).forEach(data => {
          if (data.maxScore > 0) {
            totalPercentage += (data.studentScore / data.maxScore) * 100;
            assessmentCount++;
          }
        });

        const average = assessmentCount > 0 ? totalPercentage / assessmentCount : 0;
        studentAverages.push({ studentId: student.id, average, nama_siswa: student.nama_siswa });
      } else {
        studentAverages.push({ studentId: student.id, average: 0, nama_siswa: student.nama_siswa }); // Students with no scores
      }
    });

    if (studentAverages.length === 0) return null;

    const totalAverage = studentAverages.reduce((sum, s) => sum + s.average, 0) / studentAverages.length;
    const maxScore = Math.max(...studentAverages.map(s => s.average));
    const minScore = Math.min(...studentAverages.map(s => s.average));

    return {
      totalAverage: totalAverage.toFixed(2),
      maxScore: maxScore.toFixed(2),
      minScore: minScore.toFixed(2),
      studentAverages: studentAverages.sort((a, b) => b.average - a.average), // Sort for ranking
    };
  }, [allScores, students]);

  // 2. Student Performance Trends (Descriptive)
  const studentPerformanceTrendData = useMemo(() => {
    if (!allScores || allScores.length === 0 || !selectedStudentIdForTrend) return [];

    const studentScores = allScores.filter(score => score.id_siswa === selectedStudentIdForTrend);

    const scoresByAssessment: { [assessmentId: string]: { totalScore: number; maxPossibleScore: number; date: string; name: string } } = {};
    studentScores.forEach(score => {
      const assessmentId = score.penilaian.id;
      if (!scoresByAssessment[assessmentId]) {
        scoresByAssessment[assessmentId] = {
          totalScore: 0,
          maxPossibleScore: 0,
          date: score.penilaian.tanggal,
          name: score.penilaian.nama_penilaian,
        };
      }
      scoresByAssessment[assessmentId].totalScore += score.skor_diperoleh;
      scoresByAssessment[assessmentId].maxPossibleScore += score.aspek_penilaian.skor_maksimal;
    });

    const trendData = Object.values(scoresByAssessment)
      .map(data => ({
        name: data.name,
        date: parseISO(data.date),
        score: data.maxPossibleScore > 0 ? (data.totalScore / data.maxPossibleScore) * 100 : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        ...data,
        date: format(data.date, 'dd MMM yy', { locale: id }),
      }));

    return trendData;
  }, [allScores, selectedStudentIdForTrend]);

  // 3. Attendance Summary (Descriptive)
  const attendanceSummaryData = useMemo(() => {
    if (!attendanceRecords || attendanceRecords.length === 0) return [];

    const statusCounts: { [key: string]: number } = {
      Hadir: 0,
      Sakit: 0,
      Izin: 0,
      Alpha: 0,
    };

    attendanceRecords.forEach(record => {
      statusCounts[record.status_kehadiran]++;
    });

    const totalRecords = attendanceRecords.length;

    return Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status],
      percentage: totalRecords > 0 ? ((statusCounts[status] / totalRecords) * 100).toFixed(2) : '0.00',
    }));
  }, [attendanceRecords]);

  // 4. Comparative Analysis Data
  const { data: comparisonScores1, isLoading: isLoadingComparisonScores1 } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['comparisonScores1', selectedComparisonClassId1],
    queryFn: async () => {
      if (!selectedComparisonClassId1) return [];
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          skor_diperoleh,
          aspek_penilaian (skor_maksimal),
          penilaian (id)
        `)
        .eq('penilaian.id_kelas', selectedComparisonClassId1);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId1 && activeTab === 'comparative',
  });

  const { data: comparisonScores2, isLoading: isLoadingComparisonScores2 } = useQuery<NilaiAspekSiswa[], Error>({
    queryKey: ['comparisonScores2', selectedComparisonClassId2],
    queryFn: async () => {
      if (!selectedComparisonClassId2) return [];
      const { data, error } = await supabase
        .from('nilai_aspek_siswa')
        .select(`
          id_siswa,
          skor_diperoleh,
          aspek_penilaian (skor_maksimal),
          penilaian (id)
        `)
        .eq('penilaian.id_kelas', selectedComparisonClassId2);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedComparisonClassId2 && activeTab === 'comparative',
  });

  const comparativeAnalysisData = useMemo(() => {
    if (!comparisonScores1 || !comparisonScores2 || !classes) return [];

    const calculateClassAverage = (scores: NilaiAspekSiswa[]) => {
      if (scores.length === 0) return 0;

      const studentAssessmentPercentages: { [studentId: string]: { totalPercentage: number; count: number } } = {};

      scores.forEach(score => {
        const studentId = score.id_siswa;
        const assessmentId = score.penilaian.id;
        const studentScore = score.skor_diperoleh;
        const maxScore = score.aspek_penilaian.skor_maksimal;

        if (!studentAssessmentPercentages[studentId]) {
          studentAssessmentPercentages[studentId] = { totalPercentage: 0, count: 0 };
        }

        // Group by assessment to calculate percentage per assessment first
        const studentScoresForAssessment = scores.filter(s => s.id_siswa === studentId && s.penilaian.id === assessmentId);
        const totalStudentScoreForAssessment = studentScoresForAssessment.reduce((sum, s) => sum + s.skor_diperoleh, 0);
        const totalMaxScoreForAssessment = studentScoresForAssessment.reduce((sum, s) => sum + s.aspek_penilaian.skor_maksimal, 0);

        if (totalMaxScoreForAssessment > 0) {
          const percentage = (totalStudentScoreForAssessment / totalMaxScoreForAssessment) * 100;
          // Only add once per assessment for a student
          if (!studentAssessmentPercentages[studentId][assessmentId]) {
            studentAssessmentPercentages[studentId].totalPercentage += percentage;
            studentAssessmentPercentages[studentId].count++;
            (studentAssessmentPercentages[studentId] as any)[assessmentId] = true; // Mark as processed for this assessment
          }
        }
      });

      let overallTotalAverage = 0;
      let overallStudentCount = 0;

      for (const studentId in studentAssessmentPercentages) {
        const { totalPercentage, count } = studentAssessmentPercentages[studentId];
        if (count > 0) {
          overallTotalAverage += totalPercentage / count;
          overallStudentCount++;
        }
      }

      return overallStudentCount > 0 ? overallTotalAverage / overallStudentCount : 0;
    };

    const avg1 = calculateClassAverage(comparisonScores1);
    const avg2 = calculateClassAverage(comparisonScores2);

    const className1 = classes.find(c => c.id === selectedComparisonClassId1)?.nama_kelas || 'Kelas 1';
    const className2 = classes.find(c => c.id === selectedComparisonClassId2)?.nama_kelas || 'Kelas 2';

    return [
      { name: className1, averageScore: parseFloat(avg1.toFixed(2)) },
      { name: className2, averageScore: parseFloat(avg2.toFixed(2)) },
    ];
  }, [comparisonScores1, comparisonScores2, selectedComparisonClassId1, selectedComparisonClassId2, classes]);

  // 5. Relational Analysis Data
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

  // Error handling for queries
  useEffect(() => {
    if (isErrorClasses) showError("Gagal memuat kelas: " + classesError?.message);
    if (isErrorStudents) showError("Gagal memuat siswa: " + studentsError?.message);
    if (isErrorAllScores) showError("Gagal memuat nilai penilaian: " + allScoresError?.message);
    if (isErrorAttendance) showError("Gagal memuat data kehadiran: " + attendanceError?.message);
  }, [isErrorClasses, classesError, isErrorStudents, studentsError, isErrorAllScores, allScoresError, isErrorAttendance, attendanceError]);

  const currentClass = classes?.find(c => c.id === selectedClassId);
  const currentStudent = students?.find(s => s.id === selectedStudentIdForTrend);
  const currentRelationAssessment = allAssessments?.find(a => a.id === selectedRelationAssessmentId);
  const currentRelationAspect1 = relationAspects?.find(a => a.id === selectedRelationAspectId1);
  const currentRelationAspect2 = relationAspects?.find(a => a.id === selectedRelationAspectId2);

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-dashboardAccent-DEFAULT">Analisis Statistik</h1>
      <p className="text-lg text-muted-foreground">
        Dapatkan wawasan mendalam tentang kinerja siswa dan pola kehadiran.
      </p>

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl shadow-mac-sm">
          <TabsTrigger value="descriptive" className="rounded-lg">Analisis Deskriptif</TabsTrigger>
          <TabsTrigger value="comparative" className="rounded-lg">Analisis Perbandingan</TabsTrigger>
          <TabsTrigger value="relational" className="rounded-lg">Analisis Hubungan</TabsTrigger>
        </TabsList>

        <TabsContent value="descriptive" className="space-y-8 mt-6">
          {selectedClassId ? (
            <>
              {/* Overall Class Performance */}
              <Card className="rounded-xl shadow-mac-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">Kinerja Kelas Keseluruhan: {currentClass?.nama_kelas}</CardTitle>
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  {isLoadingAllScores || isLoadingStudents ? (
                    <Skeleton className="h-24 w-full rounded-lg" />
                  ) : classPerformanceSummary ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg bg-muted/20">
                        <p className="text-sm text-muted-foreground">Rata-rata Skor Kelas</p>
                        <p className="text-2xl font-bold text-foreground">{classPerformanceSummary.totalAverage}</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-muted/20">
                        <p className="text-sm text-muted-foreground">Skor Tertinggi</p>
                        <p className="text-2xl font-bold text-foreground">{classPerformanceSummary.maxScore}</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-muted/20">
                        <p className="text-sm text-muted-foreground">Skor Terendah</p>
                        <p className="text-2xl font-bold text-foreground">{classPerformanceSummary.minScore}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Tidak ada data nilai untuk kelas ini.</p>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Summary */}
              <Card className="rounded-xl shadow-mac-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">Ringkasan Kehadiran: {currentClass?.nama_kelas}</CardTitle>
                  <CalendarCheck className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  {isLoadingAttendance || isLoadingStudents ? (
                    <Skeleton className="h-48 w-full rounded-lg" />
                  ) : attendanceSummaryData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={attendanceSummaryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {attendanceSummaryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => [`${props.payload.percentage}%`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {attendanceSummaryData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span>{entry.name}: {entry.value} ({entry.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Tidak ada data kehadiran untuk kelas ini.</p>
                  )}
                </CardContent>
              </Card>

              {/* Student Performance Trend */}
              <Card className="rounded-xl shadow-mac-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">Tren Kinerja Siswa</CardTitle>
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <Select onValueChange={setSelectedStudentIdForTrend} value={selectedStudentIdForTrend || ""}>
                    <SelectTrigger className="w-full rounded-lg mb-4">
                      <SelectValue placeholder="Pilih Siswa untuk melihat tren" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingStudents ? (
                        <SelectItem value="loading" disabled>Memuat siswa...</SelectItem>
                      ) : students && students.length > 0 ? (
                        students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.nama_siswa} ({student.nis_nisn})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-students" disabled>Tidak ada siswa di kelas ini</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedStudentIdForTrend && (
                    isLoadingAllScores ? (
                      <Skeleton className="h-64 w-full rounded-lg" />
                    ) : studentPerformanceTrendData.length > 0 ? (
                      <>
                        <h3 className="text-md font-medium mb-2">Tren Skor untuk {currentStudent?.nama_siswa}</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={studentPerformanceTrendData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" className="text-sm" />
                            <YAxis domain={[0, 100]} className="text-sm" />
                            <Tooltip
                              formatter={(value: number) => `${value.toFixed(2)}%`}
                              labelFormatter={(label: string) => `Tanggal: ${label}`}
                            />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Tidak ada data nilai untuk siswa ini.</p>
                    )
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="rounded-xl shadow-mac-md">
              <CardContent className="p-6 text-center text-muted-foreground">
                Pilih tahun/semester dan kelas dari daftar di atas untuk melihat analisis deskriptif.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparative" className="space-y-8 mt-6">
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
                    {isLoadingClasses ? (
                      <SelectItem value="loading" disabled>Memuat kelas...</SelectItem>
                    ) : filteredClasses.length > 0 ? (
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
                    {isLoadingClasses ? (
                      <SelectItem value="loading" disabled>Memuat kelas...</SelectItem>
                    ) : filteredClasses.length > 0 ? (
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
                isLoadingComparisonScores1 || isLoadingComparisonScores2 ? (
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
        </TabsContent>

        <TabsContent value="relational" className="space-y-8 mt-6">
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
                  </>
                ) : (
                  <p className="text-muted-foreground">Tidak ada data nilai untuk aspek yang dipilih dalam penilaian ini.</p>
                )
              ) : (
                <p className="text-muted-foreground">Pilih penilaian dan dua aspek untuk melihat hubungan.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatisticalAnalysis;