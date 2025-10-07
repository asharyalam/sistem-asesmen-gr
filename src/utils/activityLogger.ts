import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query'; // Import QueryClient type
import { showError } from './toast';

export type ActivityType = 
  | 'CLASS_ADDED'
  | 'CLASS_UPDATED'
  | 'CLASS_DELETED'
  | 'STUDENT_ADDED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'ASSESSMENT_ADDED'
  | 'ASSESSMENT_UPDATED'
  | 'ASSESSMENT_DELETED'
  | 'ASPECT_ADDED'
  | 'ASPECT_UPDATED'
  | 'ASPECT_DELETED'
  | 'SCORE_SAVED'
  | 'ATTENDANCE_SAVED'
  | 'WEIGHT_CATEGORY_ADDED'
  | 'WEIGHT_CATEGORY_UPDATED'
  | 'WEIGHT_CATEGORY_DELETED'
  | 'WEIGHT_SETTINGS_SAVED'
  | 'STUDENTS_IMPORTED'
  | 'LOGIN'
  | 'LOGOUT';

export const logActivity = async (user: User | null, activity_type: ActivityType, description: string, queryClient: QueryClient) => {
  if (!user) {
    console.warn("Attempted to log activity without a user session.");
    return;
  }

  const { error } = await supabase.from('activity_log').insert({
    user_id: user.id,
    activity_type: activity_type,
    description: description,
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
    // Optionally show a toast, but logging failures might be too frequent/noisy
    // showError("Gagal mencatat aktivitas: " + error.message);
  } else {
    // Invalidate the recent activities query to refresh the dashboard
    queryClient.invalidateQueries({ queryKey: ['recentActivities', user.id] });
  }
};