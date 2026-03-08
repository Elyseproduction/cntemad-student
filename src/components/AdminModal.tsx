import { useState } from 'react';
import { Lock, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function ConfirmDialog({ open, onConfirm, onCancel, loading }: { open: boolean; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border p-6 rounded-2xl max-w-sm w-full mx-4 animate-scale-in shadow-xl">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-heading font-bold text-lg text-center mb-2">Supprimer tous les messages ?</h3>
        <p className="text-muted-foreground text-sm text-center mb-6">Cette action est irréversible. Tous les messages de la communauté seront définitivement supprimés.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin, login } = useApp();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const clearAllMessages = async () => {
    setClearing(true);
    const { error } = await supabase.from('community_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setClearing(false);
    setShowConfirm(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Conversations supprimées', description: 'Tous les messages ont été effacés.' });
    }
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      setPassword('');
      setError('');
      onClose();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  if (isAdmin) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
          <div className="relative glass-card p-8 max-w-sm w-full mx-4 animate-scale-in text-center">
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-primary-foreground" />
            </div>
            <h2 className="font-heading font-bold text-xl mb-2">Mode Admin actif</h2>
            <p className="text-muted-foreground text-sm mb-6">Vous avez accès à toutes les fonctionnalités d'administration.</p>
            <div className="space-y-3">
              <button
                onClick={() => setShowConfirm(true)}
                disabled={clearing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Trash2 size={16} />
                {clearing ? 'Suppression...' : 'Effacer toutes les conversations'}
              </button>
              <button onClick={onClose} className="w-full px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Fermer
              </button>
            </div>
          </div>
        </div>
        <ConfirmDialog open={showConfirm} onConfirm={clearAllMessages} onCancel={() => setShowConfirm(false)} loading={clearing} />
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-8 max-w-sm w-full mx-4 animate-scale-in">
        <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-primary-foreground" />
        </div>
        <h2 className="font-heading font-bold text-xl text-center mb-1">Espace Admin</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">Entrez le mot de passe administrateur</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground"
              autoFocus
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-lg gradient-bg text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Entrer
          </button>
        </form>
        <button onClick={onClose} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}
