"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, BarChart, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { getDaysInMonth } from 'date-fns';

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
}

interface KehadiranRecord {
  id_siswa: string;
  tanggal_pertemuan: string;
  status_kehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}

interface StudentAttendanceSummary {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  persentase_hadir: string;
}

const AttendanceReport = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-indexed

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  const months = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i)); // Current year +/- 2

  // Fetch classes for the current user
  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<Kelas[], Error>({
    queryKey: ['classesForReport', user?.id],
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

  // Fetch students for the selected class
  const { data: students, isLoading: isLoadingStudents, isError: isErrorStudents, error: studentsError } = useQuery<Siswa[], Error>({
    queryKey: ['studentsForReport', selectedClassId],
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

  // Fetch attendance records for the selected class, month, and year
  const { data: attendanceRecords, isLoading: isLoadingAttendance, isError: isErrorAttendance, error: attendanceError } = useQuery<KehadiranRecord[], Error>({
    queryKey: ['attendanceRecords', selectedClassId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClassId || !selectedMonth || !selectedYear || !students || students.length === 0) return [];

      const startDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${getDaysInMonth(new Date(Number(selectedYear), Number(selectedMonth) - 1))}`;

      const studentIds = students.map(s => s.id);

      const { data, error } = await supabase
        .from('kehadiran')
        .select('id_siswa, tanggal_pertemuan, status_kehadiran')
        .in('id_siswa', studentIds)
        .gte('tanggal_pertemuan', startDate)
        .lte('tanggal_pertemuan', endDate);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId && !!selectedMonth && !!selectedYear && !!students && students.length > 0,
  });

  // Process attendance data into summary
  const attendanceSummary: StudentAttendanceSummary[] = React.useMemo(() => {
    if (!students || !attendanceRecords) return [];

    const summaryMap = new Map<string, Omit<StudentAttendanceSummary, 'persentase_hadir'>>();

    students.forEach(student => {
      summaryMap.set(student.id, {
        id: student.id,
        nama_siswa: student.nama_siswa,
        nis_nisn: student.nis_nisn,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
      });
    });

    attendanceRecords.forEach(record => {
      const studentSummary = summaryMap.get(record.id_siswa);
      if (studentSummary) {
        if (record.status_kehadiran === 'Hadir') studentSummary.hadir++;
        else if (record.status_kehadiran === 'Sakit') studentSummary.sakit++;
        else if (record.status_kehadiran === 'Izin') studentSummary.izin++;
        else if (record.status_kehadiran === 'Alpha') studentSummary.alpha++;
      }
    });

    const totalPossibleMeetings = getDaysInMonth(new Date(Number(selectedYear), Number(selectedMonth) - 1)); // Simplified: assuming every day is a meeting day

    return Array.from(summaryMap.values()).map(summary => {
      const totalKehadiran = summary.hadir + summary.sakit + summary.izin + summary.alpha;
      const actualMeetings = totalKehadiran > 0 ? totalKehadiran : totalPossibleMeetings; // Use actual recorded meetings if available, otherwise total days in month
      const persentase_hadir = actualMeetings > 0
        ? ((summary.hadir / actualMeetings) * 100).toFixed(2)
        : '0.00';
      return { ...summary, persentase_hadir };
    });
  }, [students, attendanceRecords, selectedMonth, selectedYear]);

  if (isErrorClasses) {
    showError("Gagal memuat kelas: " + classesError?.message);
  }
  if (isErrorStudents) {
    showError("Gagal memuat siswa: " + studentsError?.message);
  }
  if (isErrorAttendance) {
    showError("Gagal memuat data kehadiran: " + attendanceError?.message);
  }

  const currentClass = classes?.find(c => c.id === selectedClassId);
  const currentMonthLabel = months.find(m => m.value === selectedMonth)?.label;

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-4xl font-extrabold text-attendanceAccent-DEFAULT">Rekap Kehadiran Siswa</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Lihat ringkasan statistik kehadiran siswa berdasarkan kelas, bulan, dan tahun.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pilih Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Select onValueChange={setSelectedClassId} value={selectedClassId || ""}>
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

          <Select onValueChange={setSelectedMonth} value={selectedMonth}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedYear} value={selectedYear}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClassId && selectedMonth && selectedYear && (
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Rekap Kehadiran Kelas {currentClass?.nama_kelas} - {currentMonthLabel} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents || isLoadingAttendance ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : attendanceSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10">Nama Siswa (NIS/NISN)</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Sakit</TableHead>
                      <TableHead className="text-center">Izin</TableHead>
                      <TableHead className="text-center">Alpha</TableHead>
                      <TableHead className="text-center">Persentase Hadir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceSummary.map(summary => (
                      <TableRow key={summary.id}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                          {summary.nama_siswa} ({summary.nis_nisn})
                        </TableCell>
                        <TableCell className="text-center">{summary.hadir}</TableCell>
                        <TableCell className="text-center">{summary.sakit}</TableCell>
                        <TableCell className="text-center">{summary.izin}</TableCell>
                        <TableCell className="text-center">{summary.alpha}</TableCell>
                        <TableCell className="text-center font-semibold">{summary.persentase_hadir}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">Tidak ada data kehadiran untuk periode ini.</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClassId && (!students || students.length === 0) && !isLoadingStudents && (
        <Card className="rounded-xl shadow-mac-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            Tidak ada siswa terdaftar di kelas ini.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceReport;