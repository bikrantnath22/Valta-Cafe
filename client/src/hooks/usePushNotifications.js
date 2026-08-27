import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';

// Base64 to Uint8Array helper for VAPID keys
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);
    
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (supported) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        alert('Notifications are blocked by your browser. Please click the lock icon next to the URL bar and allow notifications.');
        throw new Error('Permission denied by user.');
      }
      if (permission !== 'granted') {
        throw new Error('Permission not granted.');
      }

      // Forcefully obliterate any old or corrupt service workers
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        await r.unregister();
      }

      const isDev = import.meta.env.DEV;
      const isAdmin = window.location.pathname.startsWith('/admin');
      const swUrl = isAdmin ? '/admin-sw.js' : '/sw.js';
      
      let reg;
      try {
        reg = await navigator.serviceWorker.register(swUrl, { 
          scope: isAdmin ? '/admin/' : '/',
          type: isDev ? 'module' : 'classic'
        });
        await navigator.serviceWorker.ready;
      } catch (fallbackErr) {
        console.error('Registration failed', fallbackErr);
      }

      if (!reg) {
        throw new Error('Service Worker is not registered. Please refresh the page to install it.');
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription })
      });
      
      // Trigger a test notification locally to confirm OS settings are correct
      if (reg.showNotification) {
        reg.showNotification('Notifications Enabled!', {
          body: 'You will now receive order updates even when the app is closed.',
          vibrate: [100, 50, 100]
        });
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert(`Failed to subscribe: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      
      const subscription = await reg.pushManager.getSubscription();
      
      if (subscription) {
        await apiFetch('/api/push/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, isLoading, isIOS, isStandalone, subscribe, unsubscribe };
}
