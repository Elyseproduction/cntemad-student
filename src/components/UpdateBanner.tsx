import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { RefreshCw } from 'lucide-react';

export function UpdateBanner() {
  const { updateReady, applyUpdate } = useAutoUpdate();

  if (!updateReady) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <button
        onClick={applyUpdate}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-xl hover:opacity-90 transition-all text-sm font-medium"
      >
        <RefreshCw size={14} className="animate-spin" />
        Nouvelle version disponible — Mettre à jour
      </button>
    </div>
  );
}
