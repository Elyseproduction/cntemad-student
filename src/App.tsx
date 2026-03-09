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
import { CodePractice } from "@/pages/CodePractice";
import { useAuth } from "@/hooks/useAuth";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { ProfileSetup } from "@/components/ProfileSetup";
import { InstallBanner } from "@/components/InstallBanner";
import { UpdateBanner } from "@/components/UpdateBanner";
import { NotificationOverlay } from "@/components/NotificationOverlay";
import { LanguageProvider } from "@/i18n/LanguageContext";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, needsSetup, completeSetup } = useAuth();

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

  if (needsSetup) {
    return (
      <ProfileSetup
        userId={user.id}
        defaultName={user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur'}
        defaultAvatar={user.user_metadata?.avatar_url || user.user_metadata?.picture || null}
        onComplete={completeSetup}
      />
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
      {activeTab === 'pratique' && <CodePractice />}
    </Layout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
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
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
