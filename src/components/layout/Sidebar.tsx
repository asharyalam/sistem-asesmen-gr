"use client";

import { Link, useLocation } from "react-router-dom";
import { Home, Book, ClipboardList, Settings, LogOut, TrendingUp } from "lucide-react";
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
  ];

  const handleLogout = async () => {
    console.log("Logout button clicked!");
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Gagal logout: " + error.message);
      console.error("Supabase signOut error:", error); // Log error jika ada
    } else {
      console.log("Supabase signOut call completed successfully (no immediate error). Waiting for auth state change..."); // Log jika tidak ada error
    }
    // Pesan sukses sekarang akan ditangani oleh SessionContextProvider
  };

  return (
    <aside className="group flex flex-col h-full bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border p-4 transition-all duration-300 ease-in-out w-16 hover:w-64 shadow-mac-md relative z-50">
      <div className="flex items-center justify-center h-16 border-b border-sidebar-border mb-6">
        <span className="text-xl font-bold text-primary whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Aplikasi Guru
        </span>
        <span className="text-xl font-bold text-primary whitespace-nowrap overflow-hidden opacity-100 group-hover:opacity-0 transition-opacity duration-300 absolute">
          AG
        </span>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex items-center p-2 rounded-lg text-sm font-medium transition-colors duration-200",
              location.pathname === item.path
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-mac-sm"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-sidebar-border">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg cursor-pointer"
        >
          <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Logout
          </span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;