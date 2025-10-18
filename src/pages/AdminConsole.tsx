"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import ScoreExportTool from '@/components/admin/ScoreExportTool';

const AdminConsole = () => {
  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-adminAccent-DEFAULT">Konsol Admin</h1>
      <p className="text-lg text-muted-foreground">
        Kelola data aplikasi dan akses alat administratif.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Ekspor Nilai ke Excel</CardTitle>
          <Settings2 className="h-5 w-5 text-adminAccent-DEFAULT" />
        </CardHeader>
        <CardContent>
          <ScoreExportTool />
        </CardContent>
      </Card>

      {/* Future sections for managing other data tables can be added here */}
      {/* Example:
      <Card className="rounded-xl shadow-mac-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Manajemen Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fitur manajemen pengguna akan datang.</p>
        </CardContent>
      </Card>
      */}
    </div>
  );
};

export default AdminConsole;