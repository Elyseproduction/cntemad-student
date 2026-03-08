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

const queryClient = new QueryClient();

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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
