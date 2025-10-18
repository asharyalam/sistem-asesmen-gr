"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminSection from '@/components/admin/AdminSection';
import AddKelasDialog from '@/components/admin/kelas/AddKelasDialog';
import EditKelasDialog from '@/components/admin/kelas/EditKelasDialog';
import AddKategoriBobotDialog from '@/components/admin/kategori_bobot/AddKategoriBobotDialog';
import EditKategoriBobotDialog from '@/components/admin/kategori_bobot/EditKategoriBobotDialog';
import ActivityLogTable from '@/components/admin/ActivityLogTable';
import { Kelas } from '@/types/analysis'; // Re-use existing type
import { KategoriBobot } from '@/components/weight-settings/ManageWeightCategoriesDialog'; // Re-use existing type

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
          <AdminSection<Kelas> {/* Parameter tipe generik harus langsung mengikuti nama komponen */}
            tableName="kelas"
            title="Manajemen Kelas"
            description="Kelola data kelas yang terdaftar di sistem."
            columns={kelasColumns}
            AddDialogComponent={AddKelasDialog}
            EditDialogComponent={EditKelasDialog}
            deleteActivityType="CLASS_DELETED"
            deleteDescription={(item) => `Menghapus kelas: ${item.nama_kelas} (${item.tahun_semester})`}
          />
        </TabsContent>

        <TabsContent value="kategori_bobot" className="space-y-8 mt-6">
          <AdminSection<KategoriBobot> {/* Parameter tipe generik harus langsung mengikuti nama komponen */}
            tableName="kategori_bobot"
            title="Manajemen Kategori Bobot"
            description="Kelola kategori bobot yang digunakan dalam penilaian."
            columns={kategoriBobotColumns}
            AddDialogComponent={AddKategoriBobotDialog}
            EditDialogComponent={EditKategoriBobotDialog}
            deleteActivityType="WEIGHT_CATEGORY_DELETED"
            deleteDescription={(item) => `Menghapus kategori bobot: ${item.nama_kategori}`}
          />
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