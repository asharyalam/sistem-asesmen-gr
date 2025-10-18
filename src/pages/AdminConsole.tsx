"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
// ScoreExportTool removed from here

const AdminConsole = () => {
  return (
    <div className="flex-1 space-y-8 p-4">
      <h1 className="text-4xl font-extrabold text-dashboardAccent-DEFAULT">Konsol Admin</h1> {/* Changed accent to dashboardAccent as adminAccent is removed */}
      <p className="text-lg text-muted-foreground">
        Kelola data aplikasi dan akses alat administratif.
      </p>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Alat Administratif</CardTitle>
          <Settings2 className="h-5 w-5 text-dashboardAccent-DEFAULT" />
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Tidak ada alat admin yang dikonfigurasi saat ini.</p>
          {/* Future sections for managing other data tables can be added here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminConsole;