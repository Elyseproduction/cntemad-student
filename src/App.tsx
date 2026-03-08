import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { CoursesPage } from "@/pages/CoursesPage";
import { ExercisesPage } from "@/pages/ExercisesPage";
import { CommunityPage } from "@/pages/CommunityPage";
import { VideoPage } from "@/pages/VideoPage";
import { useAuth } from "@/hooks/useAuth";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { InstallBanner } from "@/components/InstallBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { NotificationOverlay } from "@/components/NotificationOverlay";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <GoogleLoginButton />
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const { activeTab } = useApp();

  return (
    <Layout>
      {activeTab === 'cours' && <CoursesPage />}
      {activeTab === 'exercices' && <ExercisesPage />}
      {activeTab === 'communaute' && <CommunityPage />}
      {activeTab === 'videos' && <VideoPage />}
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdateBanner />
      <AppProvider>
        <AuthGate>
          <AppContent />
        </AuthGate>
        <NotificationOverlay />
        <InstallBanner />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
