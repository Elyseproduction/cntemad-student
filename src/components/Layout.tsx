import { useState } from 'react';
import { BookOpen, Brain, MessageCircle, Video, Settings, LogOut, Moon, Sun, Lock, Menu, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { AdminModal } from '@/components/AdminModal';

const tabs = [
  { id: 'cours', label: 'Cours', icon: BookOpen, emoji: '📚' },
  { id: 'exercices', label: 'Exercices IA', icon: Brain, emoji: '🧠' },
  { id: 'communaute', label: 'Communauté', icon: MessageCircle, emoji: '💬' },
  { id: 'videos', label: 'Vidéothèque', icon: Video, emoji: '🎬' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, logout, darkMode, toggleDarkMode, activeTab, setActiveTab } = useApp();
  const [showAdmin, setShowAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} bg-card/80 backdrop-blur-xl border-r border-border`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-lg shrink-0">U</div>
          {sidebarOpen && <h1 className="font-heading font-bold text-xl gradient-text">UniLearn</h1>}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'nav-item-active w-full' : 'nav-item w-full'}
            >
              <tab.icon size={20} className="shrink-0" />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-1 border-t border-border">
          <button onClick={toggleDarkMode} className="nav-item w-full">
            {darkMode ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
            {sidebarOpen && <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>}
          </button>
          <button onClick={() => setShowAdmin(true)} className="nav-item w-full opacity-60 hover:opacity-100">
            <Settings size={20} className="shrink-0" />
            {sidebarOpen && <span>Admin</span>}
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="nav-item w-full">
            <Menu size={20} className="shrink-0" />
            {sidebarOpen && <span>{sidebarOpen ? 'Réduire' : ''}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card/60 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="font-heading font-semibold text-lg">
              {tabs.find(t => t.id === activeTab)?.emoji} {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <span className="text-xs px-3 py-1.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1.5">
                  <Lock size={12} /> Mode Admin
                </span>
                <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors flex items-center gap-1.5">
                  <LogOut size={12} /> Déconnexion
                </button>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 pb-24 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/90 backdrop-blur-xl border-t border-border flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] mt-1">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-heading font-bold text-xl gradient-text">UniLearn</h1>
              <button onClick={() => setMobileMenuOpen(false)}><X size={24} /></button>
            </div>
            <nav className="flex-1 space-y-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }} className={activeTab === tab.id ? 'nav-item-active w-full' : 'nav-item w-full'}>
                  <tab.icon size={20} /> <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="space-y-1 border-t border-border pt-3">
              <button onClick={toggleDarkMode} className="nav-item w-full">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              <button onClick={() => { setShowAdmin(true); setMobileMenuOpen(false); }} className="nav-item w-full">
                <Settings size={20} /> <span>Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminModal open={showAdmin} onClose={() => setShowAdmin(false)} />
    </div>
  );
}
