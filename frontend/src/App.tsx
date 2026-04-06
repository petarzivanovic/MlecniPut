import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Partner from "./pages/Partner.tsx";
import Proizvodi from "./pages/Proizvodi.tsx";
import Farmeri from "./pages/Farmeri.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DispatcherDashboard from "./pages/DispatcherDashboard.tsx";
import DriverDashboard from "./pages/DriverDashboard.tsx";
import MlekarDashboard from "./pages/MlekarDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/proizvodi" element={<Proizvodi />} />
            <Route path="/farmeri" element={<Farmeri />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/dispecer" element={<DispatcherDashboard />} />
            <Route path="/dashboard/vozac" element={<DriverDashboard />} />
            <Route path="/dashboard/mlekar" element={<MlekarDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
