"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, BarChart3, BarChart } from 'lucide-react'; // Menambahkan ikon BarChart
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Attendance = () => {
  const { user } = useSession();
  const navigate = useNavigate(); // Inisialisasi useNavigate

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-attendanceAccent-DEFAULT">Manajemen Kehadiran</h1>
      <p className="text-lg text-muted-foreground">
        Catat dan pantau kehadiran siswa di setiap pertemuan kelas.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Catatan Kehadiran</CardTitle>
          <BarChart3 className="h-5 w-5 text-attendanceAccent-DEFAULT" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada catatan kehadiran.</p>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <Button
              onClick={() => navigate('/attendance/input')} // Arahkan ke halaman input kehadiran
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm"
            >
              <CalendarDays className="mr-2 h-4 w-4" /> Catat Kehadiran
            </Button>
            <Button
              onClick={() => navigate('/attendance/report')} // Arahkan ke halaman rekap kehadiran
              className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-mac-sm"
            >
              <BarChart className="mr-2 h-4 w-4" /> Lihat Rekap Kehadiran
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;