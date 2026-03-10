import { useApp } from '@/contexts/AppContext';
import { X, ArrowRight, Bell } from 'lucide-react';

export function NotificationOverlay() {
  const { notifications, dismissNotification, setActiveTab } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite" aria-label="Notifications">
      {notifications.map((notif) => (
        <div key={notif.id}
          className="pointer-events-auto bg-card border border-border rounded-xl shadow-lg p-3.5 flex items-start gap-3 animate-slide-down">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0 shadow-sm">
            <Bell size={14} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">{notif.message}</p>
            <button
              onClick={() => { setActiveTab(notif.tab); dismissNotification(notif.id); }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Voir <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => dismissNotification(notif.id)} aria-label="Fermer la notification"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 rounded hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
