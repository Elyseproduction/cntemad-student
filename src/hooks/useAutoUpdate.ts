import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const CHECK_INTERVAL = 1_000; // Check every 1 second

export function useAutoUpdate() {
  const { toast } = useToast();
  const toastShownRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    try {
      // Check if service worker is supported and registered
      if (!('serviceWorker' in navigator)) return;
      
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // Force check for update
      await registration.update();

      // If a new service worker is waiting, activate it
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (e) {
      // Silently ignore errors
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for controller change (new SW activated) → auto-reload
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast({
          title: '🔄 Mise à jour appliquée',
          description: 'L\'application se recharge avec la dernière version...',
        });
      }
      setTimeout(() => window.location.reload(), 1500);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Also listen for new SW installing/waiting
    const listenForWaiting = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // If already waiting, activate immediately
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      // Listen for new SW
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, skip waiting
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    };

    listenForWaiting();

    // Periodic check for updates
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    // Initial check
    checkForUpdates();

    // Also check on visibility change (when user returns to tab)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkForUpdates, toast]);
}
