import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import StartTrip from "./pages/StartTrip";
import ActiveTrips from "./pages/ActiveTrips";
import AdminDashboard from "./pages/AdminDashboard";
import TripHistory from "./pages/TripHistory";
import UserRankings from "./pages/UserRankings";
import VehicleStats from "./pages/VehicleStats";
import VehicleReservations from "./pages/VehicleReservations";
import VehicleObservations from "./pages/VehicleObservations";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<StartTrip />} />
            <Route path="/trips" element={<ActiveTrips />} />
            <Route path="/history" element={<TripHistory />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/rankings" element={<UserRankings />} />
            <Route path="/vehicle-stats" element={<VehicleStats />} />
            <Route path="/reservations" element={<VehicleReservations />} />
            <Route path="/observations" element={<VehicleObservations />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
