"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

const WeightSettings = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-foreground">Pengaturan Bobot Penilaian</h1>
      <p className="text-lg text-muted-foreground">
        Atur bobot untuk berbagai kategori penilaian (misalnya, kehadiran, tugas, ujian) untuk setiap kelas.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Bobot Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada pengaturan bobot untuk kelas Anda.</p>
          <Button className="mt-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
            <Save className="mr-2 h-4 w-4" /> Simpan Pengaturan Bobot
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeightSettings;