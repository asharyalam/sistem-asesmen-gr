"use client";

import React, { useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Book, Users, ClipboardList, History } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import locale for Indonesian date formatting
import { logActivity } from '@/utils/activityLogger'; // Import logActivity

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get queryClient here

  // Fetch total classes
  const { data: totalClasses = 0, isLoading: isLoadingClasses, isError: isErrorClasses, error: classesError } = useQuery<number, Error>({
    queryKey: ['totalClasses', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('kelas')
        .select('*', { count: 'exact', head: true })
        .eq('id_guru', user.id);

      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch class IDs for the current user, to be used by other queries
  const { data: userClassIds, isLoading: isLoadingUserClassIds, isError: isErrorUserClassIds, error: userClassIdsError } = useQuery<string[], Error>({
    queryKey: ['userClassIds', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('kelas')
        .select('id')
        .eq('id_guru', user.id);

      if (error) throw new Error(error.message);
      return data?.map(c => c.id) || [];
    },
    enabled: !!user,
  });

  // Fetch total students using the fetched class IDs
  const { data: totalStudents = 0, isLoading: isLoadingStudents, isError: isErrorStudents, error: studentsError } = useQuery<number, Error>({
    queryKey: ['totalStudents', user?.id, userClassIds],
    queryFn: async () => {
      if (!user || !userClassIds || userClassIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('siswa')
        .select('id', { count: 'exact', head: true })
        .in('id_kelas', userClassIds);

      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!user && !isLoadingUserClassIds, // Simplified condition
  });

  // Fetch total active assessments using the fetched class IDs
  const { data: totalAssessments = 0, isLoading: isLoadingAssessments, isError: isErrorAssessments, error: assessmentsError } = useQuery<number, Error>({
    queryKey: ['totalAssessments', user?.id, userClassIds],
    queryFn: async () => {
      if (!user || !userClassIds || userClassIds.length === 0) return 0;
      const { count, error } = await supabase
        .from('penilaian')
        .select('id', { count: 'exact', head: true })
        .in('id_kelas', userClassIds);

      if (error) throw new Error(error.message);
      return count || 0;
    },
    enabled: !!user && !isLoadingUserClassIds, // Simplified condition
  });

  // Fetch recent activities
  const { data: recentActivities, isLoading: isLoadingActivities } = useQuery<ActivityLog[], Error>({
    queryKey: ['recentActivities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, activity_type, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  // Error logging for queries
  useEffect(() => {
    if (isErrorClasses) console.error("Error fetching total classes:", classesError);
    if (isErrorUserClassIds) console.error("Error fetching user class IDs:", userClassIdsError);
    if (isErrorStudents) console.error("Error fetching total students:", studentsError);
    if (isErrorAssessments) console.error("Error fetching total assessments:", assessmentsError);
  }, [isErrorClasses, classesError, isErrorUserClassIds, userClassIdsError, isErrorStudents, studentsError, isErrorAssessments, assessmentsError]);

  return (
    <div className="flex-1 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Ini adalah dashboard Anda. Di sini Anda dapat mengelola kelas, siswa, penilaian, dan kehadiran dengan mudah.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Total Kelas</CardTitle>
            <Book className="h-5 w-5 text-dashboardAccent-DEFAULT" />
          </CardHeader>
          <CardContent>
            {isLoadingClasses && totalClasses === 0 ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-3xl font-bold text-foreground">{totalClasses}</div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {isLoadingClasses && totalClasses === 0 ? <Skeleton className="h-4 w-1/2" /> : (
                totalClasses === 0 ? "Anda belum memiliki kelas." : `Anda memiliki ${totalClasses} kelas.`
              )}
            </p>
            <Button onClick={() => navigate('/classes')} className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Kelas Baru
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Total Siswa</CardTitle>
            <Users className="h-5 w-5 text-dashboardAccent-DEFAULT" />
          </CardHeader>
          <CardContent>
            {(isLoadingStudents || isLoadingUserClassIds) && totalStudents === 0 ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-3xl font-bold text-foreground">{totalStudents}</div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {(isLoadingStudents || isLoadingUserClassIds) && totalStudents === 0 ? <Skeleton className="h-4 w-1/2" /> : (
                totalStudents === 0 ? "Belum ada siswa terdaftar." : `Anda memiliki ${totalStudents} siswa.`
              )}
            </p>
            <Button onClick={() => navigate('/students')} className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-mac-md hover:shadow-mac-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Penilaian Aktif</CardTitle>
            <ClipboardList className="h-5 w-5 text-dashboardAccent-DEFAULT" />
          </CardHeader>
          <CardContent>
            {(isLoadingAssessments || isLoadingUserClassIds) && totalAssessments === 0 ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-3xl font-bold text-foreground">{totalAssessments}</div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {(isLoadingAssessments || isLoadingUserClassIds) && totalAssessments === 0 ? <Skeleton className="h-4 w-1/2" /> : (
                totalAssessments === 0 ? "Tidak ada penilaian aktif." : `Anda memiliki ${totalAssessments} penilaian aktif.`
              )}
            </p>
            <Button onClick={() => navigate('/assessments')} className="mt-6 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-mac-sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Buat Penilaian
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Aktivitas Terbaru</CardTitle>
          <History className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoadingActivities && (!recentActivities || recentActivities.length === 0) ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <ul className="space-y-2">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="text-sm text-foreground">
                  <span className="font-medium">{format(new Date(activity.created_at), 'dd MMMM yyyy HH:mm', { locale: id })}:</span> {activity.description}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Tidak ada aktivitas terbaru.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;