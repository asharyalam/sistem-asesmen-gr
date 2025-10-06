"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Book } from 'lucide-react';

const Dashboard = () => {
  const { user } = useSession();

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-foreground">Selamat Datang, {user?.user_metadata?.first_name || user?.email}!</h1>
      <p className="text-lg text-muted-foreground">
        Ini adalah dashboard Anda. Di sini Anda dapat mengelola kelas, siswa, penilaian, dan kehadiran dengan mudah.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Total Kelas</CardTitle>
            <Book className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0</div> {/* Placeholder, will fetch from DB */}
            <p className="text-sm text-muted-foreground mt-1">Anda belum memiliki kelas.</p>
            <Button className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Kelas Baru
            </Button>
          </CardContent>
        </Card>
        {/* Add more cards for quick stats like Total Siswa, Penilaian Terbaru, etc. */}
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Total Siswa</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0</div>
            <p className="text-sm text-muted-foreground mt-1">Belum ada siswa terdaftar.</p>
            <Button className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Penilaian Aktif</CardTitle>
            <ClipboardList className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0</div>
            <p className="text-sm text-muted-foreground mt-1">Tidak ada penilaian aktif.</p>
            <Button className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Penilaian
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for recent activities or quick links */}
      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tidak ada aktivitas terbaru.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;