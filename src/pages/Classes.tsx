"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const Classes = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold">Manajemen Kelas</h1>
      <p className="text-lg text-muted-foreground">
        Di sini Anda dapat melihat, menambah, mengedit, dan menghapus kelas yang Anda ajar.
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daftar Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Belum ada kelas yang terdaftar.</p>
          <Button variant="outline" className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kelas Baru
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Classes;