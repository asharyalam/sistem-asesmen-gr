"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, BarChart3 } from 'lucide-react'; // Menambahkan ikon BarChart3

const Attendance = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-attendanceAccent-DEFAULT">Manajemen Kehadiran</h1>
      <p className="text-lg text-muted-foreground">
        Catat dan pantau kehadiran siswa di setiap pertemuan kelas.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Catatan Kehadiran</CardTitle>
          <BarChart3 className="h-5 w-5 text-attendanceAccent-DEFAULT" /> {/* Menggunakan ikon BarChart3 dengan warna aksen */}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada catatan kehadiran.</p>
          <Button className="mt-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
            <CalendarDays className="mr-2 h-4 w-4" /> Catat Kehadiran
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;