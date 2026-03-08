import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 1_000;

export function useAutoUpdate() {
  const [updateReady, setUpdateReady] = useState(false);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      await registration.update();
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // When new SW activates, mark update as ready (don't reload!)
    const onControllerChange = () => {
      setUpdateReady(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const listenForWaiting = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    };

    listenForWaiting();

    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    checkForUpdates();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkForUpdates]);

  return { updateReady, applyUpdate };
}
