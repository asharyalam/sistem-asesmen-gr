"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Book } from 'lucide-react'; // Menambahkan Book di sini

const Dashboard = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-6">
      <h1 className="text-3xl font-bold">Selamat Datang, {user?.user_metadata?.first_name || user?.email}!</h1>
      <p className="text-lg text-muted-foreground">
        Ini adalah dashboard Anda. Di sini Anda dapat mengelola kelas, siswa, penilaian, dan kehadiran.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div> {/* Placeholder, will fetch from DB */}
            <p className="text-xs text-muted-foreground">Anda belum memiliki kelas.</p>
            <Button variant="outline" className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Kelas Baru
            </Button>
          </CardContent>
        </Card>
        {/* Add more cards for quick stats like Total Siswa, Penilaian Terbaru, etc. */}
      </div>

      {/* Placeholder for recent activities or quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tidak ada aktivitas terbaru.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;