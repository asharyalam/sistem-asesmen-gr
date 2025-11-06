"use client";

import { Link, useLocation } from "react-router-dom";
import { Home, Book, ClipboardList, Settings, LogOut, TrendingUp, User, Bell, CalendarDays, Library, LifeBuoy, RefreshCcw } from "lucide-react"; // Import User icon
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSession } from '@/components/auth/SessionContextProvider';
import { logActivity } from '@/utils/activityLogger';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSession();

  const navItems = [
    {
      name: "Dashboard",
      icon: Home,
      path: "/",
    },
    {
      name: "Manajemen Kelas",
      icon: Book,
      path: "/classes",
    },
    {
      name: "Manajemen Penilaian",
      icon: ClipboardList,
      path: "/assessments",
    },
    {
      name: "Analisis Statistik",
      icon: TrendingUp,
      path: "/statistical-analysis",
    },
    {
      name: "Profil",
      icon: User,
      path: "/profile",
    },
    // Additional items from the image, using placeholders for now
    {
      name: "Laporan",
      icon: Bell, // Using Bell as a placeholder for Reports icon
      path: "/reports", // Placeholder path
    },
    {
      name: "Kalender",
      icon: CalendarDays,
      path: "/calendar", // Placeholder path
    },
    {
      name: "Perpustakaan Saya",
      icon: Library,
      path: "/my-library", // Placeholder path
    },
  ];

  const bottomNavItems = [
    {
      name: "Dukungan",
      icon: LifeBuoy,
      path: "/support", // Placeholder path
    },
    {
      name: "Pembaruan",
      icon: RefreshCcw,
      path: "/updates", // Placeholder path
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
    <aside className="flex flex-col h-full w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border p-4 shadow-mac-md relative z-50">
      <div className="flex items-center h-16 border-b border-sidebar-border mb-6 px-2">
        <img src="/placeholder.svg" alt="Kidzee Logo" className="h-8 w-8 mr-2" /> {/* Placeholder for logo */}
        <span className="text-xl font-bold text-white whitespace-nowrap">
          Aplikasi Guru
        </span>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center p-3 rounded-lg text-sm font-medium transition-colors duration-200",
              location.pathname === item.path
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-mac-sm"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border space-y-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center p-3 rounded-lg text-sm font-medium transition-colors duration-200",
              location.pathname === item.path
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-mac-sm"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {item.name}
            </span>
          </Link>
        ))}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg cursor-pointer p-3"
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