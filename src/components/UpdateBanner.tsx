import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { RefreshCw, X, ArrowRight, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function UpdateBanner() {
  const { updateReady, applyUpdate } = useAutoUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (updateReady) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(interval); return 100; }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [updateReady]);

  if (!updateReady || dismissed) return null;

  // createPortal → rendu directement dans document.body,
  // hors de tout Sheet/Dialog Radix qui bloquerait les événements
  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 animate-slide-down"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 to-accent/90 backdrop-blur-xl shadow-2xl shadow-primary/25 border border-white/20">
        <div
          className="absolute inset-0 bg-white/10 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />

        <div className="relative p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                <div className="relative w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles size={16} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white text-sm">Nouvelle version disponible</h3>
                <p className="text-xs text-white/80">Des améliorations et correctifs vous attendent</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group"
              aria-label="Fermer"
            >
              <X size={16} className="text-white/60 group-hover:text-white transition-colors" />
            </button>
          </div>

          {showDetails && (
            <div className="mb-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm text-xs text-white/90 space-y-1.5 animate-fade-in">
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Optimisation des performances</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Correction de bugs mineurs</p>
              <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Amélioration de l'interface</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              {showDetails ? 'Masquer' : 'Détails'}
            </button>
            <div className="flex-1" />
            <button
              onClick={applyUpdate}
              className="group relative overflow-hidden px-5 py-2 rounded-xl bg-white text-primary font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin-slow" />
                Mettre à jour
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div className="h-full bg-white transition-all duration-300 ease-out rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
