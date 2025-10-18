"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminSection from '@/components/admin/AdminSection'; // Tetap import AdminSection jika masih digunakan di tempat lain
import AddKelasDialog from '@/components/admin/kelas/AddKelasDialog';
import EditKelasDialog from '@/components/admin/kelas/EditKelasDialog';
import AddKategoriBobotDialog from '@/components/admin/kategori_bobot/AddKategoriBobotDialog';
import EditKategoriBobotDialog from '@/components/admin/kategori_bobot/EditKategoriBobotDialog';
import ActivityLogTable from '@/components/admin/ActivityLogTable';
import { Kelas } from '@/types/analysis'; // Re-use existing type
import { KategoriBobot } from '@/components/weight-settings/ManageWeightCategoriesDialog'; // Re-use existing type

// Import komponen pembungkus baru
import KelasAdminSection from '@/components/admin/kelas/KelasAdminSection';
import KategoriBobotAdminSection from '@/components/admin/kategori_bobot/KategoriBobotAdminSection';

const AdminConsole = () => {
  const [activeTab, setActiveTab] = useState('kelas');

  const kelasColumns = [
    { header: 'Nama Kelas', accessorKey: 'nama_kelas' },
    { header: 'Tahun/Semester', accessorKey: 'tahun_semester' },
    { header: 'Dibuat Pada', accessorKey: 'created_at', render: (row: Kelas) => new Date(row.created_at).toLocaleDateString() },
  ];

  const kategoriBobotColumns = [
    { header: 'Nama Kategori', accessorKey: 'nama_kategori' },
    { header: 'Dibuat Pada', accessorKey: 'created_at', render: (row: KategoriBobot) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-adminAccent-DEFAULT">Konsol Admin</h1>
      <p className="text-lg text-muted-foreground">
        Kelola semua data aplikasi Anda dari satu tempat.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-5 rounded-xl shadow-mac-sm">
          <TabsTrigger value="kelas" className="rounded-lg">Kelas</TabsTrigger>
          <TabsTrigger value="kategori_bobot" className="rounded-lg">Kategori Bobot</TabsTrigger>
          {/* Tambahkan TabsTrigger untuk tabel lain di sini */}
          <TabsTrigger value="activity_log" className="rounded-lg">Log Aktivitas</TabsTrigger>
        </TabsList>

        <TabsContent value="kelas" className="space-y-8 mt-6">
          <KelasAdminSection columns={kelasColumns} />
        </TabsContent>

        <TabsContent value="kategori_bobot" className="space-y-8 mt-6">
          <KategoriBobotAdminSection columns={kategoriBobotColumns} />
        </TabsContent>

        {/* Tambahkan TabsContent untuk tabel lain di sini */}

        <TabsContent value="activity_log" className="space-y-8 mt-6">
          <ActivityLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConsole;