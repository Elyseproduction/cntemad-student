import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export function AdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin, login } = useApp();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative glass-card p-8 max-w-sm w-full mx-4 animate-scale-in text-center">
          <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-primary-foreground" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Mode Admin actif</h2>
          <p className="text-muted-foreground text-sm mb-4">Vous avez accès à toutes les fonctionnalités d'administration.</p>
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
            Fermer
          </button>
        </div>
      </div>
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
