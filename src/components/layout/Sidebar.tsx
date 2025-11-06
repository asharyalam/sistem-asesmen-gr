"use client";

import { Link, useLocation } from "react-router-dom";
import { Home, Book, ClipboardList, LogOut, TrendingUp, User, Users, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSession } from '@/components/auth/SessionContextProvider';
import UserProfileCard from './UserProfileCard'; // Import UserProfileCard

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSession();

  const navItems = [
    {
      name: "Home Page",
      icon: Home,
      path: "/",
    },
    {
      name: "Students",
      icon: Users,
      path: "/students",
    },
    {
      name: "Classes",
      icon: Book,
      path: "/classes",
    },
    {
      name: "Assessments",
      icon: ClipboardList,
      path: "/assessments",
    },
    {
      name: "Attendance",
      icon: CalendarDays,
      path: "/attendance",
    },
    {
      name: "Statistical Analysis",
      icon: TrendingUp,
      path: "/statistical-analysis",
    },
    {
      name: "Weight Settings",
      icon: Settings, // Using Settings for Weight Settings
      path: "/weight-settings",
    },
    {
      name: "Profile",
      icon: User,
      path: "/profile",
    },
  ];

  const handleLogout = async () => {
    console.log("Logout button clicked!");
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Gagal logout: " + error.message);
      console.error("Supabase signOut error:", error);
    } else {
      console.log("Supabase signOut call completed successfully (no immediate error). Waiting for auth state change...");
    }
  };

  return (
    <aside className="flex flex-col h-full w-72 bg-sidebar-background text-sidebar-foreground border-r border-border p-4 shadow-mac-md relative z-50">
      <div className="flex items-center h-16 mb-6 px-2">
        <img src="/placeholder.svg" alt="Logo" className="h-8 w-8 mr-2" />
        <span className="text-xl font-bold text-foreground whitespace-nowrap">
          Aplikasi Guru
        </span>
      </div>
      
      <UserProfileCard /> {/* Integrated UserProfileCard */}

      <div className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-4">
        Main Menu
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center p-3 rounded-lg text-sm font-medium transition-colors duration-200",
              location.pathname === item.path
                ? "bg-primary text-primary-foreground shadow-mac-sm"
                : "hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-border space-y-2">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer p-3"
        >
          <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="whitespace-nowrap">
            Logout
          </span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;