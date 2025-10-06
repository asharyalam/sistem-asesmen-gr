import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Classes from "./pages/Classes"; // Import halaman baru
import Students from "./pages/Students"; // Import halaman baru
import Assessments from "./pages/Assessments"; // Import halaman baru
import Attendance from "./pages/Attendance"; // Import halaman baru
import WeightSettings from "./pages/WeightSettings"; // Import halaman baru
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
            <Route path="/classes" element={<AuthLayout><Classes /></AuthLayout>} /> {/* Rute baru */}
            <Route path="/students" element={<AuthLayout><Students /></AuthLayout>} /> {/* Rute baru */}
            <Route path="/assessments" element={<AuthLayout><Assessments /></AuthLayout>} /> {/* Rute baru */}
            <Route path="/attendance" element={<AuthLayout><Attendance /></AuthLayout>} /> {/* Rute baru */}
            <Route path="/weight-settings" element={<AuthLayout><WeightSettings /></AuthLayout>} /> {/* Rute baru */}
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