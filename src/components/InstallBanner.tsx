import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallBanner() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-20 right-3 md:bottom-6 md:right-4 z-50 animate-fade-in flex items-center justify-end">
      {expanded ? (
        /* Expanded card */
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2 shadow-lg backdrop-blur-xl animate-scale-in">
          <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-sm shrink-0">
            U
          </div>
          <div className="leading-tight">
            <p className="font-heading font-semibold text-xs text-foreground">Installer UniLearn</p>
            <p className="text-muted-foreground text-[10px]">Accès rapide hors-ligne</p>
          </div>
          <button
            onClick={async () => { await install(); setExpanded(false); }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Download size={12} /> Installer
          </button>
          <button onClick={() => setDismissed(true)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Collapsed: small floating button */
        <button
          onClick={() => setExpanded(true)}
          className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          title="Installer l'application"
        >
          <Download size={18} className="text-primary-foreground" />
        </button>
      )}
    </div>
  );
}
