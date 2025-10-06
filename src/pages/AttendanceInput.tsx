"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Save, ChevronLeft } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface Siswa {
  id: string;
  nama_siswa: string;
  nis_nisn: string;
}

interface Kehadiran {
  id_siswa: string;
  tanggal_pertemuan: string;
  status_kehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}

interface AttendanceStatus {
  [studentId: string]: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';
}

const AttendanceInput = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendance, setAttendance] = useState<AttendanceStatus>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes for the current user
  const { data: classes, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<Kelas[], Error>({
    queryKey: ['classesForAttendance', user?.id],
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
    queryKey: ['studentsForAttendance', selectedClassId],
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

  // Fetch existing attendance for the selected class and date
  const { data: existingAttendance, isLoading: isLoadingExistingAttendance, isError: isErrorExistingAttendance, error: existingAttendanceError } = useQuery<Kehadiran[], Error>({
    queryKey: ['existingAttendance', selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId || !selectedDate || !students || students.length === 0) return [];

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const studentIds = students.map(s => s.id);

      const { data, error } = await supabase
        .from('kehadiran')
        .select('id_siswa, tanggal_pertemuan, status_kehadiran')
        .eq('tanggal_pertemuan', formattedDate)
        .in('id_siswa', studentIds);

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!selectedClassId && !!selectedDate && !!students && students.length > 0,
  });

  useEffect(() => {
    if (existingAttendance && students) {
      const initialAttendance: AttendanceStatus = {};
      students.forEach(student => {
        const record = existingAttendance.find(att => att.id_siswa === student.id);
        initialAttendance[student.id] = record ? record.status_kehadiran : 'Hadir'; // Default to Hadir
      });
      setAttendance(initialAttendance);
    } else {
      setAttendance({});
    }
  }, [existingAttendance, students]);

  const handleAttendanceChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId || !selectedDate || !students || students.length === 0) {
      showError("Pilih kelas dan tanggal, serta pastikan ada siswa.");
      return;
    }

    setIsSaving(true);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const attendanceRecordsToUpsert = students.map(student => ({
      id_siswa: student.id,
      tanggal_pertemuan: formattedDate,
      status_kehadiran: attendance[student.id] || 'Hadir',
    }));

    try {
      const { error } = await supabase
        .from('kehadiran')
        .upsert(attendanceRecordsToUpsert, { onConflict: 'id_siswa, tanggal_pertemuan' });

      if (error) {
        throw error;
      }

      showSuccess("Kehadiran berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ['existingAttendance', selectedClassId, selectedDate] });
    } catch (error: any) {
      showError("Gagal menyimpan kehadiran: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isErrorClasses) {
    showError("Gagal memuat kelas: " + classesError?.message);
  }
  if (isErrorStudents) {
    showError("Gagal memuat siswa: " + studentsError?.message);
  }
  if (isErrorExistingAttendance) {
    showError("Gagal memuat kehadiran yang sudah ada: " + existingAttendanceError?.message);
  }

  const currentClass = classes?.find(c => c.id === selectedClassId);

  return (
    <div className="flex-1 space-y-8 p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')} className="rounded-full">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-4xl font-extrabold text-attendanceAccent-DEFAULT">Catat Kehadiran Siswa</h1>
      </div>
      <p className="text-lg text-muted-foreground">
        Pilih kelas dan tanggal untuk mencatat atau mengedit kehadiran siswa.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pilih Kelas dan Tanggal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full pl-3 text-left font-normal rounded-lg",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pilih tanggal</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {selectedClassId && selectedDate && students && students.length > 0 && (
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Kehadiran Kelas {currentClass?.nama_kelas} pada {format(selectedDate, 'PPP')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents || isLoadingExistingAttendance ? (
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
                      <TableHead className="text-center">Status Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                          {student.nama_siswa} ({student.nis_nisn})
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroup
                            defaultValue={attendance[student.id] || 'Hadir'}
                            onValueChange={(value: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha') => handleAttendanceChange(student.id, value)}
                            className="flex justify-center space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Hadir" id={`hadir-${student.id}`} />
                              <Label htmlFor={`hadir-${student.id}`}>Hadir</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Sakit" id={`sakit-${student.id}`} />
                              <Label htmlFor={`sakit-${student.id}`}>Sakit</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Izin" id={`izin-${student.id}`} />
                              <Label htmlFor={`izin-${student.id}`}>Izin</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Alpha" id={`alpha-${student.id}`} />
                              <Label htmlFor={`alpha-${student.id}`}>Alpha</Label>
                            </div>
                          </RadioGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button
              onClick={handleSaveAttendance}
              className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
              disabled={isSaving || isLoadingStudents || isLoadingExistingAttendance}
            >
              <Save className="mr-2 h-4 w-4" /> {isSaving ? "Menyimpan..." : "Simpan Kehadiran"}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedClassId && selectedDate && (!students || students.length === 0) && !isLoadingStudents && (
        <Card className="rounded-xl shadow-mac-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            Tidak ada siswa terdaftar di kelas ini.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceInput;