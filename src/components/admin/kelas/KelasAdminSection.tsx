"use client";

import React from 'react';
import AdminSection from '@/components/admin/AdminSection';
import AddKelasDialog from '@/components/admin/kelas/AddKelasDialog';
import EditKelasDialog from '@/components/admin/kelas/EditKelasDialog';
import { Kelas } from '@/types/analysis';

interface KelasAdminSectionProps {
  columns: { header: string; accessorKey: string; render?: (row: Kelas) => React.ReactNode }[];
}

const KelasAdminSection: React.FC<KelasAdminSectionProps> = ({ columns }) => {
  return (
    <AdminSection<Kelas>
      tableName="kelas"
      title="Manajemen Kelas"
      description="Kelola data kelas yang terdaftar di sistem."
      columns={columns}
      AddDialogComponent={AddKelasDialog}
      EditDialogComponent={EditKelasDialog}
      deleteActivityType="CLASS_DELETED"
      deleteDescription={(item) => `Menghapus kelas: ${item.nama_kelas} (${item.tahun_semester})`}
    />
  );
};

export default KelasAdminSection;