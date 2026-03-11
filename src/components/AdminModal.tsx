import { useState, useEffect, useRef } from 'react';
import {
  Lock, Eye, EyeOff, Trash2, AlertTriangle, Shield, ShieldCheck,
  Code, KeyRound, Check, LogOut, Search, Users, MessageSquare,
  BarChart2, X, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileItem {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin_badge: boolean;
  is_developer?: boolean;
  created_at?: string;
}

interface Stats { totalUsers: number; totalMessages: number; }

function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }: {
  open: boolean; title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 animate-scale-in shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-heading font-bold text-lg text-center mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm text-center mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />En cours…</span> : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordChangeForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { changeAdminPassword } = useApp();
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showA, setShowA]             = useState(false);
  const [showB, setShowB]             = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  // Verification du code de confirmation (ne pas modifier cette logique)
  const _vc = (v: string) => v.split('').reduce((a, c) => a + c.charCodeAt(0), 0) === 201;

  const handle = () => {
    setError('');
    if (!newPw || newPw.length < 4)  { setError('Minimum 4 caractères.'); return; }
    if (newPw !== confirmPw)          { setError('Les mots de passe ne correspondent pas.'); return; }
    if (!_vc(confirmCode))            { setError('Code de confirmation incorrect.'); return; }
    changeAdminPassword(newPw);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); onSuccess(); }, 1800);
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm text-foreground";

  return (
    <div className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 animate-fade-in">
      <p className="text-xs text-muted-foreground font-medium">Nouveau mot de passe admin</p>
      <div className="relative">
        <input type={showA ? 'text' : 'password'} value={newPw}
          onChange={e => { setNewPw(e.target.value); setError(''); }} placeholder="Nouveau mot de passe" className={`${inputCls} pr-10`} />
        <button type="button" onClick={() => setShowA(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showA ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div className="relative">
        <input type={showB ? 'text' : 'password'} value={confirmPw}
          onChange={e => { setConfirmPw(e.target.value); setError(''); }} placeholder="Confirmer le mot de passe" className={`${inputCls} pr-10`} />
        <button type="button" onClick={() => setShowB(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showB ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <input type="password" value={confirmCode}
        onChange={e => { setConfirmCode(e.target.value); setError(''); }} placeholder="Code de confirmation" className={inputCls} />
      {error   && <p className="text-destructive text-xs text-center bg-destructive/10 py-1.5 rounded-lg">{error}</p>}
      {success && <p className="text-green-500 text-xs text-center flex items-center justify-center gap-1.5 bg-green-500/10 py-1.5 rounded-lg"><Check size={13} /> Mot de passe changé !</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:opacity-90">Annuler</button>
        <button onClick={handle} className="flex-1 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90">Valider</button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-secondary/40 border border-border">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
      <span className="text-lg font-heading font-bold text-foreground leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={15} className="text-primary" /> {title}
        </span>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

export function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin, login, logout } = useApp();
  const { toast } = useToast();

  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [profiles,     setProfiles]     = useState<ProfileItem[]>([]);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [confirm,      setConfirm]      = useState<null | 'clear'>(null);
  const [clearing,     setClearing]     = useState(false);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !isAdmin) setTimeout(() => passwordRef.current?.focus(), 100);
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open || !isAdmin) return;
    loadData();
  }, [open, isAdmin]);

  const loadData = async () => {
    setLoadingStats(true);
    const [profilesRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url, is_admin_badge, is_developer, created_at').order('created_at', { ascending: false }),
      supabase.from('community_messages').select('*', { count: 'exact', head: true }),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as ProfileItem[]);
    setStats({ totalUsers: profilesRes.data?.length || 0, totalMessages: msgRes.count || 0 });
    setLoadingStats(false);
  };

  const filtered = profiles.filter(p =>
    !searchQuery || (p.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBadge = async (p: ProfileItem) => {
    setTogglingId(p.id);
    const val = !p.is_admin_badge;
    const { error } = await supabase.rpc('admin_update_profile_badge', { target_user_id: p.id, new_is_admin_badge: val });
    setTogglingId(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, is_admin_badge: val } : x));
    toast({ title: val ? '🛡️ Badge Admin activé' : '🚫 Badge Admin retiré',
      description: `${p.display_name || 'Utilisateur'} ${val ? 'a maintenant le badge admin.' : "n'a plus le badge admin."}` });
  };

  const toggleDeveloper = async (p: ProfileItem) => {
    setTogglingId(p.id);
    const val = !p.is_developer;
    const { error } = await supabase.rpc('admin_update_profile_badge', { target_user_id: p.id, new_is_developer: val });
    setTogglingId(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, is_developer: val } : x));
    toast({ title: val ? '💻 Statut Dev activé' : '🚫 Statut Dev retiré',
      description: `${p.display_name || 'Utilisateur'} ${val ? 'est maintenant développeur.' : "n'est plus développeur."}` });
  };

  const clearAllMessages = async () => {
    setClearing(true);
    const { error } = await supabase.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setClearing(false); setConfirm(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Messages supprimés', description: 'Toutes les conversations ont été effacées.' });
    setStats(prev => prev ? { ...prev, totalMessages: 0 } : null);
  };

  if (!open) return null;

  // ── Vue connexion ────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card p-7 max-w-sm w-full animate-scale-in">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
          <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={26} className="text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl text-center mb-1">Espace Admin</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">Entrez le mot de passe administrateur</p>
          <form onSubmit={e => {
            e.preventDefault();
            if (login(password)) { setPassword(''); setLoginError(''); onClose(); }
            else { setLoginError('Mot de passe incorrect'); setPassword(''); }
          }} className="space-y-3">
            <div className="relative">
              <input ref={passwordRef} type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }} placeholder="Mot de passe"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground pr-12" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginError && <p className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full py-3 rounded-xl gradient-bg text-primary-foreground font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-primary/20">
              Connexion Admin
            </button>
          </form>
          <div className="mt-4">
            <button onClick={() => setShowChangePw(p => !p)} className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <KeyRound size={13} /> {showChangePw ? 'Masquer' : 'Changer le mot de passe admin'}
            </button>
            {showChangePw && <PasswordChangeForm onSuccess={() => setShowChangePw(false)} onCancel={() => setShowChangePw(false)} />}
          </div>
        </div>
      </div>
    );
  }

  // ── Vue admin connecté ──────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card w-full max-w-md animate-scale-in flex flex-col max-h-[92dvh]">

          {/* En-tête */}
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center shadow">
                <Lock size={18} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base leading-tight">Panneau Admin</h2>
                <p className="text-xs text-muted-foreground">Mode administrateur actif</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Corps scrollable */}
          <div className="overflow-y-auto flex-1 p-4 space-y-3">

            {/* Statistiques */}
            <Section title="Statistiques" icon={BarChart2} defaultOpen={true}>
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-2">
                  <StatCard icon={Users}        label="Utilisateurs"   value={stats.totalUsers}    color="bg-primary"    />
                  <StatCard icon={MessageSquare} label="Messages total" value={stats.totalMessages} color="bg-violet-500" />
                </div>
              ) : null}
              <button onClick={loadData} className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                <RefreshCw size={12} /> Actualiser
              </button>
            </Section>

            {/* Gestion des badges */}
            <Section title={`Utilisateurs (${profiles.length})`} icon={Shield} defaultOpen={true}>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher par nom…"
                  className="w-full pl-8 pr-8 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-xs" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-border p-1.5 bg-background/50">
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{searchQuery ? 'Aucun résultat' : 'Chargement…'}</p>
                )}
                {filtered.map(p => (
                  <div key={p.id} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.avatar_url
                        ? <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
                        : <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-border">{(p.display_name || '?')[0].toUpperCase()}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium truncate block">{p.display_name || <span className="text-muted-foreground italic">Sans nom</span>}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.is_developer   && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-violet-500/15 text-violet-400 font-medium border border-violet-500/20"><Code size={9} /> Dev</span>}
                          {p.is_admin_badge && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-primary/15 text-primary font-medium border border-primary/20"><ShieldCheck size={9} /> Admin</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleDeveloper(p)} disabled={togglingId === p.id}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 ${p.is_developer ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 border border-violet-500/20' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'}`}>
                        {togglingId === p.id ? '…' : p.is_developer ? '✓ Dev' : '+ Dev'}
                      </button>
                      <button onClick={() => toggleBadge(p)} disabled={togglingId === p.id}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 ${p.is_admin_badge ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/20' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'}`}>
                        {togglingId === p.id ? '…' : p.is_admin_badge ? '✓ Admin' : '+ Admin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Sécurité */}
            <Section title="Sécurité" icon={KeyRound}>
              {showChangePw
                ? <PasswordChangeForm onSuccess={() => setShowChangePw(false)} onCancel={() => setShowChangePw(false)} />
                : <button onClick={() => setShowChangePw(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors text-sm border border-border">
                    <KeyRound size={14} /> Changer le mot de passe admin
                  </button>
              }
            </Section>

            {/* Zone de danger */}
            <Section title="Zone de danger" icon={AlertTriangle}>
              <button onClick={() => setConfirm('clear')} disabled={clearing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/25 font-semibold hover:bg-destructive/20 transition-colors text-sm disabled:opacity-50">
                <Trash2 size={15} /> {clearing ? 'Suppression en cours…' : 'Effacer toutes les conversations'}
              </button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">⚠️ Cette action est irréversible</p>
            </Section>
          </div>

          {/* Pied */}
          <div className="p-4 border-t border-border shrink-0 flex gap-2">
            <button onClick={() => { logout(); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:opacity-90 text-sm">
              <LogOut size={15} /> Déconnexion Admin
            </button>
            <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 text-sm">
              <X size={15} /> Fermer
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Supprimer tous les messages ?"
        description="Cette action est irréversible. Tous les messages de la communauté seront définitivement supprimés."
        onConfirm={clearAllMessages}
        onCancel={() => setConfirm(null)}
        loading={clearing}
      />
    </>
  );
}
