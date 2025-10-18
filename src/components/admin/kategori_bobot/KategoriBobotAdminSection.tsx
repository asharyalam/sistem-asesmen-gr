"use client";

import React from 'react';
import AdminSection from '@/components/admin/AdminSection';
import AddKategoriBobotDialog from '@/components/admin/kategori_bobot/AddKategoriBobotDialog';
import EditKategoriBobotDialog from '@/components/admin/kategori_bobot/EditKategoriBobotDialog';
import { KategoriBobot } from '@/components/weight-settings/ManageWeightCategoriesDialog';

interface KategoriBobotAdminSectionProps {
  columns: { header: string; accessorKey: string; render?: (row: KategoriBobot) => React.ReactNode }[];
}

const KategoriBobotAdminSection: React.FC<KategoriBobotAdminSectionProps> = ({ columns }) => {
  return (
    <AdminSection<KategoriBobot>
      tableName="kategori_bobot"
      title="Manajemen Kategori Bobot"
      description="Kelola kategori bobot yang digunakan dalam penilaian."
      columns={columns}
      AddDialogComponent={AddKategoriBobotDialog}
      EditDialogComponent={EditKategoriBobotDialog}
      deleteActivityType="WEIGHT_CATEGORY_DELETED"
      deleteDescription={(item) => `Menghapus kategori bobot: ${item.nama_kategori}`}
    />
  );
};

export default KategoriBobotAdminSection;