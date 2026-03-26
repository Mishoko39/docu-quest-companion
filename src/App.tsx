import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Spaces from "@/pages/Spaces";
import SpaceDetail from "@/pages/SpaceDetail";
import ModuleDetail from "@/pages/ModuleDetail";
import LessonDetail from "@/pages/LessonDetail";
import Notifications from "@/pages/Notifications";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminContent from "@/pages/admin/AdminContent";
import AdminLessonEditor from "@/pages/admin/AdminLessonEditor";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/spaces/:spaceId" element={<SpaceDetail />} />
              <Route path="/modules/:moduleId" element={<ModuleDetail />} />
              <Route path="/lessons/:lessonId" element={<LessonDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/lessons/:lessonId/edit" element={<AdminLessonEditor />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
