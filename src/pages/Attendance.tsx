"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

const Attendance = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold">Manajemen Kehadiran</h1>
      <p className="text-lg text-muted-foreground">
        Catat dan pantau kehadiran siswa di setiap pertemuan kelas.
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Catatan Kehadiran</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada catatan kehadiran.</p>
          <Button variant="outline" className="mt-4">
            <CalendarDays className="mr-2 h-4 w-4" /> Catat Kehadiran
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;