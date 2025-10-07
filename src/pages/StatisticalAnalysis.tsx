"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, BookOpen, CalendarCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

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

const StatisticalAnalysis = () => {
  const { user } = useSession();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTahunSemester, setSelectedTahunSemester] = useState<string | null>(null);
  const [selectedStudentIdForTrend, setSelectedStudentIdForTrend] = useState<string | null>(null);

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

  // --- Data Processing ---

  // 1. Overall Class Performance
  const classPerformanceSummary = useMemo(() => {
    if (!allScores || allScores.length === 0 || !students || students.length === 0) return null;

    const studentTotalScores: { [studentId: string]: { total: number; count: number } } = {};
    const assessmentMaxScores: { [assessmentId: string]: number } = {};

    allScores.forEach(score => {
      const assessmentId = score.penilaian.id;
      const aspectMaxScore = score.aspek_penilaian.skor_maksimal;

      // Calculate max score for each assessment
      if (!assessmentMaxScores[assessmentId]) {
        assessmentMaxScores[assessmentId] = 0;
      }
      // Sum max scores for aspects belonging to the same assessment
      // This needs to be done carefully to avoid double counting if an aspect appears multiple times (which it shouldn't)
      // A better way is to fetch aspects separately and sum their max scores per assessment.
      // For now, let's assume `allScores` gives us unique aspect-assessment pairs for max score calculation.
      // A more robust approach would be to group by assessment.id and sum unique aspect.skor_maksimal.
      // For simplicity, let's calculate total score per student per assessment, then average.

      // Calculate total score obtained by student for each assessment
      if (!studentTotalScores[score.id_siswa]) {
        studentTotalScores[score.id_siswa] = { total: 0, count: 0 };
      }
      studentTotalScores[score.id_siswa].total += score.skor_diperoleh;
      studentTotalScores[score.id_siswa].count++;
    });

    // Calculate average score per student (across all assessments in the selected class)
    const studentAverages: { studentId: string; average: number; nama_siswa: string }[] = [];
    students.forEach(student => {
      if (studentTotalScores[student.id] && studentTotalScores[student.id].count > 0) {
        const average = studentTotalScores[student.id].total / studentTotalScores[student.id].count;
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

  // 2. Student Performance Trends
  const studentPerformanceTrendData = useMemo(() => {
    if (!allScores || allScores.length === 0 || !selectedStudentIdForTrend) return [];

    const studentScores = allScores.filter(score => score.id_siswa === selectedStudentIdForTrend);

    // Group scores by assessment and calculate total score for each assessment
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

    // Convert to percentage and sort by date
    const trendData = Object.values(scoresByAssessment)
      .map(data => ({
        name: data.name,
        date: parseISO(data.date),
        score: data.maxPossibleScore > 0 ? (data.totalScore / data.maxPossibleScore) * 100 : 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        ...data,
        date: format(data.date, 'dd MMM yy', { locale: id }), // Format date for display
      }));

    return trendData;
  }, [allScores, selectedStudentIdForTrend]);

  // 3. Attendance Summary
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

  // Error handling for queries
  useEffect(() => {
    if (isErrorClasses) showError("Gagal memuat kelas: " + classesError?.message);
    if (isErrorStudents) showError("Gagal memuat siswa: " + studentsError?.message);
    if (isErrorAllScores) showError("Gagal memuat nilai penilaian: " + allScoresError?.message);
    if (isErrorAttendance) showError("Gagal memuat data kehadiran: " + attendanceError?.message);
  }, [isErrorClasses, classesError, isErrorStudents, studentsError, isErrorAllScores, allScoresError, isErrorAttendance, attendanceError]);

  const currentClass = classes?.find(c => c.id === selectedClassId);
  const currentStudent = students?.find(s => s.id === selectedStudentIdForTrend);

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-dashboardAccent-DEFAULT">Analisis Statistik</h1>
      <p className="text-lg text-muted-foreground">
        Dapatkan wawasan mendalam tentang kinerja siswa dan pola kehadiran.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pilih Filter Analisis</CardTitle>
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

      {selectedClassId && (
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
      )}

      {!selectedClassId && !isLoadingClasses && (
        <Card className="rounded-xl shadow-mac-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            Pilih tahun/semester dan kelas dari daftar di atas untuk melihat analisis statistik.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatisticalAnalysis;