"use client";

import React from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

const ActivityLogTable = () => {
  const { user } = useSession();

  const { data: activityLogs, isLoading, isError, error } = useQuery<ActivityLog[], Error>({
    queryKey: ['activityLogs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, user_id, activity_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 recent activities for performance

      if (error) {
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  if (isError) {
    showError("Gagal memuat log aktivitas: " + error?.message);
  }

  return (
    <Card className="rounded-xl shadow-mac-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Log Aktivitas</CardTitle>
        <History className="h-5 w-5 text-adminAccent-DEFAULT" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : activityLogs && activityLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Tipe Aktivitas</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: id })}</TableCell>
                    <TableCell>{log.activity_type}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{log.user_id.substring(0, 8)}...</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground">Tidak ada log aktivitas terbaru.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogTable;