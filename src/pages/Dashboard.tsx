"use client";

import React, { useEffect } from 'react';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Book, Users, ClipboardList, History, Download, MessageSquare, NotebookPen, CalendarDays } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import locale for Indonesian date formatting
import { logActivity } from '@/utils/activityLogger'; // Import logActivity
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    <div className="flex-1 space-y-8"> {/* Removed p-4 as AuthLayout now handles padding */}
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      
      {/* Assignments Overview */}
      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Ikhtisar Penilaian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Classes Card */}
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
              <Download className="h-8 w-8 text-blue-500 mb-2" />
              {isLoadingClasses && totalClasses === 0 ? (
                <Skeleton className="h-6 w-1/2 mb-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{totalClasses}</div>
              )}
              <p className="text-sm text-muted-foreground text-center">Kelas Dibuat</p>
            </div>

            {/* Total Students Card */}
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
              <Users className="h-8 w-8 text-purple-500 mb-2" />
              {(isLoadingStudents || isLoadingUserClassIds) && totalStudents === 0 ? (
                <Skeleton className="h-6 w-1/2 mb-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
              )}
              <p className="text-sm text-muted-foreground text-center">Siswa Terdaftar</p>
            </div>

            {/* Total Assessments Card */}
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
              <ClipboardList className="h-8 w-8 text-orange-500 mb-2" />
              {(isLoadingAssessments || isLoadingUserClassIds) && totalAssessments === 0 ? (
                <Skeleton className="h-6 w-1/2 mb-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{totalAssessments}</div>
              )}
              <p className="text-sm text-muted-foreground text-center">Penilaian Aktif</p>
            </div>

            {/* Placeholder for 'Reviewed' */}
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
              <Book className="h-8 w-8 text-green-500 mb-2" />
              <div className="text-2xl font-bold text-foreground">25</div>
              <p className="text-sm text-muted-foreground text-center">Ditinjau</p>
            </div>

            {/* Placeholder for 'Reports Generated' */}
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
              <TrendingUp className="h-8 w-8 text-red-500 mb-2" />
              <div className="text-2xl font-bold text-foreground">5</div>
              <p className="text-sm text-muted-foreground text-center">Laporan Dibuat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Students Performance (Placeholder) */}
        <Card className="lg:col-span-2 rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Kinerja Siswa</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">Lihat Semua Siswa</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://github.com/shadcn.png" alt="Oliver James" />
                  <AvatarFallback>OJ</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Oliver James</p>
                  <p className="text-xs text-muted-foreground">G1 / Class-B</p>
                </div>
              </div>
              <span className="font-semibold text-foreground">97%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://github.com/shadcn.png" alt="David Peter" />
                  <AvatarFallback>DP</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">David Peter</p>
                  <p className="text-xs text-muted-foreground">G1 / Class-B</p>
                </div>
              </div>
              <span className="font-semibold text-foreground">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://github.com/shadcn.png" alt="Lilly Paul" />
                  <AvatarFallback>LP</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Lilly Paul</p>
                  <p className="text-xs text-muted-foreground">G1 / Class-B</p>
                </div>
              </div>
              <span className="font-semibold text-foreground">92%</span>
            </div>
          </CardContent>
        </Card>

        {/* Latest Discussions (Placeholder) */}
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Diskusi Terbaru</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">Lihat Semua Diskusi</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Perjalanan ke New York</p>
                <p className="text-xs text-muted-foreground">G1 / Class-A - 2 menit yang lalu</p>
              </div>
              <div className="flex items-center space-x-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">+3</span>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Diskusi Ujian Akhir</p>
                <p className="text-xs text-muted-foreground">G1 / Class-B - 2 menit yang lalu</p>
              </div>
              <div className="flex items-center space-x-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">+2</span>
              </div>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Diskusi Juara Kelas</p>
                <p className="text-xs text-muted-foreground">G1 / Class-C - 1 menit yang lalu</p>
              </div>
              <div className="flex items-center space-x-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">+1</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Notes & Announcements (Placeholder) */}
        <Card className="lg:col-span-2 rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Catatan Saya</CardTitle>
            <Button variant="outline" size="sm" className="rounded-lg">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Catatan
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Siapkan Pertanyaan untuk Ujian Unit</p>
                <p className="text-xs text-muted-foreground">Siapkan pertanyaan ujian unit untuk siswa kelas B</p>
                <p className="text-xs text-muted-foreground">05 Des 2019</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">...</Button>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">Pengumuman untuk Siswa</p>
                <p className="text-xs text-muted-foreground">Umumkan pembaruan penting kepada siswa kelas A</p>
                <p className="text-xs text-muted-foreground">01 Des 2019</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">...</Button>
            </div>
          </CardContent>
        </Card>

        {/* My Planner (Placeholder) */}
        <Card className="rounded-xl shadow-mac-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Perencana Saya</CardTitle>
            <Select defaultValue="Dec 2019">
              <SelectTrigger className="w-[120px] rounded-lg">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dec 2019">Des 2019</SelectItem>
                <SelectItem value="Jan 2020">Jan 2020</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8">{"<"}</Button>
              <span className="font-medium">Des 12, Kamis</span>
              <Button variant="ghost" size="icon" className="h-8 w-8">{">"}</Button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={index} className="font-semibold text-muted-foreground">{day}</div>
              ))}
              {Array.from({ length: 7 }, (_, i) => i + 8).map((date) => (
                <Button key={date} variant={date === 12 ? "default" : "ghost"} size="icon" className="rounded-full h-8 w-8">
                  {date}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* To Do Tasks (Placeholder) */}
      <Card className="rounded-xl shadow-mac-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Tugas yang Harus Dilakukan</CardTitle>
          <Button variant="outline" size="sm" className="rounded-lg">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Tugas
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="assignments">
            <TabsList className="grid w-full grid-cols-3 rounded-lg shadow-mac-sm mb-4">
              <TabsTrigger value="assignments" className="rounded-lg">Tugas</TabsTrigger>
              <TabsTrigger value="assessments" className="rounded-lg">Penilaian</TabsTrigger>
              <TabsTrigger value="others" className="rounded-lg">Lainnya</TabsTrigger>
            </TabsList>
            <TabsContent value="assignments" className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Rumus Unit Aljabar Matematika</p>
                  <p className="text-xs text-muted-foreground">G1 / Kelas-A</p>
                </div>
                <span className="text-xs text-destructive">Terlambat</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Membaca Bab 3 Sejarah</p>
                  <p className="text-xs text-muted-foreground">G1 / Kelas-B</p>
                </div>
                <span className="text-xs text-green-600">Selesai</span>
              </div>
            </TabsContent>
            <TabsContent value="assessments">
              <p className="text-muted-foreground">Tidak ada penilaian yang harus dilakukan.</p>
            </TabsContent>
            <TabsContent value="others">
              <p className="text-muted-foreground">Tidak ada tugas lain.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activities */}
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