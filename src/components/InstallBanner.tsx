import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallBanner() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-16 left-2 right-2 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg backdrop-blur-xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-heading font-bold text-lg shrink-0">
          U
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm">Installer UniLearn</p>
          <p className="text-muted-foreground text-xs">Accès rapide comme une vraie app</p>
        </div>
        <button
          onClick={async () => {
            await install();
          }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Download size={14} />
          Installer
        </button>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
