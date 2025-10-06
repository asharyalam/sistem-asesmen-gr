import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Classes from "./pages/Classes";
import Students from "./pages/Students";
import Assessments from "./pages/Assessments";
import Attendance from "./pages/Attendance";
import WeightSettings from "./pages/WeightSettings";
import ScoreInput from "./pages/ScoreInput";
import AttendanceInput from "./pages/AttendanceInput";
import AttendanceReport from "./pages/AttendanceReport"; // Import halaman baru AttendanceReport
import { SessionContextProvider } from "./components/auth/SessionContextProvider";
import AuthLayout from "./components/layout/AuthLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthLayout><Dashboard /></AuthLayout>} />
            <Route path="/classes" element={<AuthLayout><Classes /></AuthLayout>} />
            <Route path="/students" element={<AuthLayout><Students /></AuthLayout>} />
            <Route path="/assessments" element={<AuthLayout><Assessments /></AuthLayout>} />
            <Route path="/assessments/input-score" element={<AuthLayout><ScoreInput /></AuthLayout>} />
            <Route path="/attendance" element={<AuthLayout><Attendance /></AuthLayout>} />
            <Route path="/attendance/input" element={<AuthLayout><AttendanceInput /></AuthLayout>} />
            <Route path="/attendance/report" element={<AuthLayout><AttendanceReport /></AuthLayout>} /> {/* Rute baru untuk rekap kehadiran */}
            <Route path="/weight-settings" element={<AuthLayout><WeightSettings /></AuthLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* Protected routes will go inside AuthLayout */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;