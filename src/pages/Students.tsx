"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const Students = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-foreground">Manajemen Siswa</h1>
      <p className="text-lg text-muted-foreground">
        Kelola daftar siswa Anda di sini, termasuk menambahkan siswa ke kelas tertentu.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Daftar Siswa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada siswa yang terdaftar.</p>
          <Button className="mt-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa Baru
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Students;