import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BookOpen, Brain, MessageCircle, Video, Settings, Moon, Sun, Lock, Menu, X, Download, Users } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useApp } from '@/contexts/AppContext';
import { AdminModal } from '@/components/AdminModal';
import { ProfileMenu } from '@/components/ProfileMenu';
import { supabase } from '@/integrations/supabase/client';

const tabs = [
  { id: 'cours',      label: 'Cours',        icon: BookOpen,      emoji: '📚' },
  { id: 'exercices',  label: 'Exercices IA',  icon: Brain,         emoji: '🧠' },
  { id: 'communaute', label: 'Communauté',    icon: MessageCircle, emoji: '💬' },
  { id: 'videos',     label: 'Vidéothèque',   icon: Video,         emoji: '🎬' },
];

const NAV_H = 56; // px hauteur de la nav mobile

export interface OnlineUser { username: string; color: string; }
interface OnlineContextType { count: number; users: OnlineUser[]; }
const OnlineContext = createContext<OnlineContextType>({ count: 0, users: [] });
export const useOnlineCount = () => useContext(OnlineContext).count;
export const useOnlineUsers  = () => useContext(OnlineContext);

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, darkMode, toggleDarkMode, activeTab, setActiveTab } = useApp();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const canInstall = isInstallable && !isInstalled;

  const [showAdmin,      setShowAdmin]      = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [lastSeenCount,  setLastSeenCount]  = useState(0);
  const [onlineCount,    setOnlineCount]    = useState(0);
  const [onlineUsers,    setOnlineUsers]    = useState<OnlineUser[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setSidebarOpen(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const username  = localStorage.getItem('community_username') || 'user';
    const userColor = localStorage.getItem('community_color')    || '#6C63FF';
    const ch = supabase.channel('app_presence', { config: { presence: { key: `${username}-${Date.now()}` } } });
    ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState();
        const keys  = Object.keys(state);
        setOnlineCount(keys.length);
        const users: OnlineUser[] = [];
        const seen  = new Set<string>();
        for (const key of keys)
          for (const p of (state[key] as any[]))
            if (p.username && !seen.has(p.username)) { seen.add(p.username); users.push({ username: p.username, color: p.color || '#6C63FF' }); }
        setOnlineUsers(users);
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED') await ch.track({ username, color: userColor, online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchCount = useCallback(async () => {
    const { count } = await supabase.from('community_messages').select('*', { count: 'exact', head: true });
    return count || 0;
  }, []);

  useEffect(() => {
    if (activeTab === 'communaute')
      fetchCount().then(c => { setLastSeenCount(c); setUnreadCount(0); });
  }, [activeTab, fetchCount]);

  useEffect(() => {
    fetchCount().then(c => {
      if (activeTab === 'communaute') { setLastSeenCount(c); setUnreadCount(0); }
      else {
        const seen = parseInt(localStorage.getItem('community_last_seen_count') || '0', 10);
        setLastSeenCount(seen); setUnreadCount(Math.max(0, c - seen));
      }
    });
    const ch = supabase.channel('layout_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, () => {
        fetchCount().then(c => {
          setUnreadCount(() => {
            if (activeTab === 'communaute') { setLastSeenCount(c); localStorage.setItem('community_last_seen_count', String(c)); return 0; }
            return Math.max(0, c - lastSeenCount);
          });
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchCount, activeTab, lastSeenCount]);

  useEffect(() => {
    if (activeTab === 'communaute') localStorage.setItem('community_last_seen_count', String(lastSeenCount));
  }, [activeTab, lastSeenCount]);

  const renderBadge = (tabId: string) => {
    if (tabId !== 'communaute' || unreadCount <= 0) return null;
    return (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
        {unreadCount > 99 ? '99+' : `+${unreadCount}`}
      </span>
    );
  };

  const OnlineDot = () => (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      {onlineCount}
    </span>
  );

  const isCommunity = activeTab === 'communaute';

  return (
    <OnlineContext.Provider value={{ count: onlineCount, users: onlineUsers }}>
    {/*
      --nav-h : variable CSS disponible pour CommunityPage.
      Si la barre de saisie utilise `position: fixed; bottom: 0`,
      elle doit utiliser `bottom: var(--nav-h)` à la place.
    */}
    <div
      className="min-h-screen gradient-mesh"
      style={{ '--nav-h': `${NAV_H}px` } as React.CSSProperties}
    >

      {/* Sidebar desktop */}
      <aside className={`fixed left-0 top-0 h-full z-40 hidden md:flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} bg-card/80 backdrop-blur-xl border-r border-border`}>
        <div className="p-4 flex items-center gap-3 border-b border-border min-h-[64px]">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-base shrink-0 shadow-sm">U</div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-bold text-lg gradient-text leading-tight">UniLearn</h1>
              <div className="flex items-center gap-1 mt-0.5"><OnlineDot /><span className="text-[10px] text-muted-foreground">en ligne</span></div>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              title={!sidebarOpen ? tab.label : undefined} aria-label={tab.label}
              className={`relative ${activeTab === tab.id ? 'nav-item-active w-full' : 'nav-item w-full'} ${!sidebarOpen ? 'justify-center' : ''}`}>
              <div className="relative shrink-0"><tab.icon size={20} />{renderBadge(tab.id)}</div>
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 space-y-0.5 border-t border-border">
          {!sidebarOpen && <div className="flex justify-center py-1"><OnlineDot /></div>}
          <button onClick={toggleDarkMode} title={darkMode ? 'Mode clair' : 'Mode sombre'} className={`nav-item w-full ${!sidebarOpen ? 'justify-center' : ''}`}>
            {darkMode ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
            {sidebarOpen && <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>}
          </button>
          <button onClick={() => setShowAdmin(true)} title="Administration" className={`nav-item w-full ${!sidebarOpen ? 'justify-center' : ''} ${isAdmin ? 'text-primary opacity-100' : 'opacity-60 hover:opacity-100'}`}>
            <Settings size={20} className="shrink-0" />{sidebarOpen && <span>⚙️ Admin{isAdmin ? ' ✓' : ''}</span>}
          </button>
          {canInstall && (
            <button onClick={() => install()} title="Installer" className={`nav-item w-full text-primary ${!sidebarOpen ? 'justify-center' : ''}`}>
              <Download size={20} className="shrink-0" />{sidebarOpen && <span>Installer l'app</span>}
            </button>
          )}
          <button onClick={() => setSidebarOpen(p => !p)} title={sidebarOpen ? 'Réduire (Ctrl+B)' : 'Agrandir (Ctrl+B)'} className={`nav-item w-full ${!sidebarOpen ? 'justify-center' : ''}`}>
            <Menu size={20} className="shrink-0" />{sidebarOpen && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Wrapper principal */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-16'} ${isCommunity ? 'flex flex-col h-dvh' : ''}`}>

        {/* Header — hauteur fixe 64px */}
        <header className="sticky top-0 z-30 bg-card/60 backdrop-blur-xl border-b border-border px-3 py-3 flex items-center justify-between min-h-[64px] shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <button className="md:hidden p-1 rounded-lg hover:bg-secondary transition-colors" aria-label="Menu" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <h2 className="font-heading font-semibold text-base truncate max-w-[140px] sm:max-w-none">
              {tabs.find(t => t.id === activeTab)?.emoji} {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="md:hidden flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-full bg-secondary/60 whitespace-nowrap">
              <Users size={12} /> {onlineCount}
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                title="Ouvrir le panneau Admin"
                className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1 hover:bg-primary/30 transition-colors cursor-pointer"
              >
                ⚙️ <Lock size={11} /> Admin
              </button>
            )}
            <ProfileMenu />
          </div>
        </header>

        {/*
          Zone Communauté mobile :
          ┌─────────────────────┐
          │ Header (64px)       │  sticky
          ├─────────────────────┤
          │ Messages (scroll)   │  flex-1
          ├─────────────────────┤
          │ Barre de saisie     │  sticky bottom-0 DANS ce conteneur
          ├─────────────────────┤  ← fin du <main>
          │ Nav (56px) z-[60]   │  fixed, toujours visible
          └─────────────────────┘

          max-h-[calc(100dvh - 64px - 56px - safe-area)] sur mobile
          → le contenu ne déborde jamais sur la nav
        */}
        <main
          className={`animate-fade-in ${
            isCommunity
              ? [
                  'flex-1 flex flex-col',
                  'max-h-[calc(100dvh-64px-56px-env(safe-area-inset-bottom))]',
                  'md:max-h-[calc(100dvh-64px)]',
                ].join(' ')
              : 'p-4 md:p-6 pb-24 md:pb-6'
          }`}
          style={isCommunity ? { overflow: 'hidden', width: '100%', boxSizing: 'border-box' } : undefined}
        >
          {children}
        </main>
      </div>

      {/*
        Nav mobile — z-[60] : toujours au-dessus de tout contenu de page.
        min-h-[56px] = NAV_H utilisé dans le calc ci-dessus.
        paddingBottom safe-area = support iPhone avec barre d'accueil.
      */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-card/95 backdrop-blur-xl border-t border-border flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-label={tab.label}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors relative ${
              activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
            }`}>
            <div className="relative"><tab.icon size={20} />{renderBadge(tab.id)}</div>
            <span className="text-[9px] font-medium leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 w-72 bg-card border-r border-border p-4 animate-slide-in-right flex flex-col shadow-2xl overflow-y-auto"
            style={{ bottom: `calc(${NAV_H}px + env(safe-area-inset-bottom))` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="font-heading font-bold text-xl gradient-text">UniLearn</h1>
                <div className="flex items-center gap-1.5 mt-0.5"><OnlineDot /><span className="text-xs text-muted-foreground">en ligne</span></div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X size={22} /></button>
            </div>
            <nav className="flex-1 space-y-0.5">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`relative ${activeTab === tab.id ? 'nav-item-active w-full' : 'nav-item w-full'}`}>
                  <div className="relative"><tab.icon size={20} />{renderBadge(tab.id)}</div>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <div className="space-y-0.5 border-t border-border pt-3 mt-auto">
              <button onClick={toggleDarkMode} className="nav-item w-full">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}<span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
              </button>
              <button onClick={() => { setShowAdmin(true); setMobileMenuOpen(false); }} className={`nav-item w-full ${isAdmin ? 'text-primary font-semibold' : ''}`}>
                <Settings size={20} /><span>⚙️ Admin{isAdmin ? ' ✓' : ''}</span>
              </button>
              {canInstall && (
                <button onClick={() => { install(); setMobileMenuOpen(false); }} className="nav-item w-full text-primary font-medium">
                  <Download size={20} /><span>Installer l'application</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AdminModal open={showAdmin} onClose={() => setShowAdmin(false)} />
    </div>
    </OnlineContext.Provider>
  );
}
