import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Trash2, AlertTriangle, Shield, ShieldCheck, Code, KeyRound, Check, LogOut, Search } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileItem {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin_badge: boolean;
  is_developer?: boolean;
}

function ConfirmDialog({ open, onConfirm, onCancel, loading }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 animate-scale-in shadow-xl">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-heading font-bold text-lg text-center mb-2">Supprimer tous les messages ?</h3>
        <p className="text-muted-foreground text-sm text-center mb-6">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sous-composant extrait — évite la duplication du formulaire mot de passe
function PasswordChangeForm({ onSuccess }: { onSuccess: () => void }) {
  const { changeAdminPassword } = useApp();
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [showNewPw, setShowNewPw]     = useState(false);
  const [showConf, setShowConf]       = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const handle = () => {
    setError('');
    if (!newPw || newPw.length < 4)  { setError('Minimum 4 caractères.'); return; }
    if (newPw !== confirmPw)          { setError('Les mots de passe ne correspondent pas.'); return; }
    if (confirmCode !== '1206')       { setError('Code de confirmation incorrect.'); return; }
    changeAdminPassword(newPw);
    setSuccess(true);
    setNewPw(''); setConfirmPw(''); setConfirmCode('');
    setTimeout(() => { setSuccess(false); onSuccess(); }, 2000);
  };

  const cls = "w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm text-foreground pr-10";

  return (
    <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3 animate-fade-in">
      <div className="relative">
        <input type={showNewPw ? 'text' : 'password'} value={newPw}
          onChange={e => { setNewPw(e.target.value); setError(''); }} placeholder="Nouveau mot de passe" className={cls} />
        <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div className="relative">
        <input type={showConf ? 'text' : 'password'} value={confirmPw}
          onChange={e => { setConfirmPw(e.target.value); setError(''); }} placeholder="Confirmer le nouveau mot de passe" className={cls} />
        <button type="button" onClick={() => setShowConf(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <input type="password" value={confirmCode}
        onChange={e => { setConfirmCode(e.target.value); setError(''); }} placeholder="Code de confirmation"
        className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm text-foreground"
      />
      {error   && <p className="text-destructive text-xs text-center">{error}</p>}
      {success && <p className="text-green-500 text-xs text-center flex items-center justify-center gap-1"><Check size={13} /> Mot de passe changé !</p>}
      <button onClick={handle} className="w-full py-2.5 rounded-lg gradient-bg text-primary-foreground font-medium text-sm hover:opacity-90">
        Valider le changement
      </button>
    </div>
  );
}

export function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin, login, logout } = useApp();
  const { toast } = useToast();
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loginError,   setLoginError]   = useState('');
  const [clearing,     setClearing]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [profiles,     setProfiles]     = useState<ProfileItem[]>([]);
  const [togglingId,   setTogglingId]   = useState<string | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');

  useEffect(() => {
    if (open && isAdmin) {
      supabase.from('profiles').select('id, display_name, avatar_url, is_admin_badge, is_developer')
        .then(({ data }) => { if (data) setProfiles(data as ProfileItem[]); });
    }
  }, [open, isAdmin]);

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
    toast({ title: val ? '🛡️ Badge activé' : 'Badge retiré', description: `${p.display_name || 'Utilisateur'} ${val ? 'a le badge admin' : "n'a plus le badge admin"}.` });
  };

  const toggleDeveloper = async (p: ProfileItem) => {
    setTogglingId(p.id);
    const val = !p.is_developer;
    const { error } = await supabase.rpc('admin_update_profile_badge', { target_user_id: p.id, new_is_developer: val });
    setTogglingId(null);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, is_developer: val } : x));
    toast({ title: val ? '💻 Développeur' : 'Statut retiré', description: `${p.display_name || 'Utilisateur'} ${val ? 'est développeur' : "n'est plus développeur"}.` });
  };

  const clearAllMessages = async () => {
    setClearing(true);
    const { error } = await supabase.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setClearing(false); setShowConfirm(false);
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✅ Conversations supprimées', description: 'Tous les messages ont été effacés.' });
  };

  if (!open) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card p-8 max-w-sm w-full mx-4 animate-scale-in">
          <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={28} className="text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl text-center mb-1">Espace Admin</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">Entrez le mot de passe administrateur</p>

          <form onSubmit={e => { e.preventDefault(); if (login(password)) { setPassword(''); setLoginError(''); onClose(); } else setLoginError('Mot de passe incorrect'); }} className="space-y-4">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                placeholder="Mot de passe"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground"
                autoFocus />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginError && <p className="text-destructive text-sm text-center">{loginError}</p>}
            <button type="submit" className="w-full py-3 rounded-lg gradient-bg text-primary-foreground font-medium hover:opacity-90">Entrer</button>
          </form>

          <div className="mt-4">
            <button onClick={() => setShowChangePw(p => !p)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <KeyRound size={14} /> Changer le mot de passe admin
            </button>
            {showChangePw && <PasswordChangeForm onSuccess={() => setShowChangePw(false)} />}
          </div>

          <button onClick={onClose} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card p-6 max-w-md w-full mx-4 animate-scale-in max-h-[90dvh] overflow-y-auto">

          <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Lock size={24} className="text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl text-center mb-1">Mode Admin actif</h2>
          <p className="text-muted-foreground text-sm text-center mb-5">Gérez les badges et les conversations.</p>

          {/* Badges */}
          <div className="mb-5">
            <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
              <Shield size={15} className="text-primary" /> Badges
              <span className="ml-auto text-xs text-muted-foreground">{profiles.length} utilisateur(s)</span>
            </h3>

            {profiles.length > 4 && (
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm" />
              </div>
            )}

            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-secondary/30">
              {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{searchQuery ? 'Aucun résultat' : 'Chargement…'}</p>}
              {filtered.map(p => (
                <div key={p.id} className="space-y-1.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">{(p.display_name || '?')[0].toUpperCase()}</div>
                    }
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block">{p.display_name || 'Sans nom'}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {p.is_developer  && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-accent/20 text-accent font-medium"><Code size={10} /> Dev</span>}
                        {p.is_admin_badge && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary font-medium"><ShieldCheck size={10} /> Admin</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pl-9">
                    <button onClick={() => toggleDeveloper(p)} disabled={togglingId === p.id}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all shrink-0 disabled:opacity-50 ${p.is_developer ? 'bg-accent/10 text-accent hover:bg-accent/20' : 'bg-muted hover:bg-muted/80'}`}>
                      {togglingId === p.id ? '…' : p.is_developer ? 'Dev ✓' : 'Développeur'}
                    </button>
                    <button onClick={() => toggleBadge(p)} disabled={togglingId === p.id}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all shrink-0 disabled:opacity-50 ${p.is_admin_badge ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-muted hover:bg-muted/80'}`}>
                      {togglingId === p.id ? '…' : p.is_admin_badge ? 'Admin ✓' : 'Admin'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Changer mot de passe */}
          <div className="mb-4">
            <button onClick={() => setShowChangePw(p => !p)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors text-sm">
              <KeyRound size={15} /> Changer le mot de passe admin
            </button>
            {showChangePw && <div className="mt-2"><PasswordChangeForm onSuccess={() => setShowChangePw(false)} /></div>}
          </div>

          <div className="space-y-2">
            <button onClick={() => setShowConfirm(true)} disabled={clearing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
              <Trash2 size={16} /> {clearing ? 'Suppression…' : 'Effacer toutes les conversations'}
            </button>
            <button onClick={() => { logout(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-secondary text-foreground font-medium hover:opacity-90">
              <LogOut size={16} /> Se déconnecter du mode Admin
            </button>
            <button onClick={onClose} className="w-full px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
              Fermer
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog open={showConfirm} onConfirm={clearAllMessages} onCancel={() => setShowConfirm(false)} loading={clearing} />
    </>
  );
}
