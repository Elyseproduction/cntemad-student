import { useApp } from '@/contexts/AppContext';
import { X, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationOverlay() {
  const { notifications, dismissNotification, setActiveTab } = useApp();
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const newIds = notifications.map(n => n.id).filter(id => !visible.includes(id));
    if (newIds.length > 0) {
      setVisible(prev => [...prev, ...newIds]);
    }
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto bg-card border border-border rounded-xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-snug">{notif.message}</p>
            <button
              onClick={() => {
                setActiveTab(notif.tab);
                dismissNotification(notif.id);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Voir <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => dismissNotification(notif.id)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
