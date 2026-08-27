import { createContext, useContext, useEffect, useState } from 'react';

const PWAInstallContext = createContext({
  isInstallable: false,
  isIOS: false,
  isStandalone: false,
  promptInstall: async () => {},
});

export function PWAInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => {
    const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
    return localStorage.getItem(key) === 'true';
  });

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed (standalone mode)
    const checkStandalone = () => {
      const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
      if (localStorage.getItem(key) === 'true') return true;
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    };
    if (checkStandalone()) {
      setIsStandalone(true);
      const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
      localStorage.setItem(key, 'true');
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen for appinstalled event to hide the install button
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
      localStorage.setItem(key, 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
        const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
        localStorage.setItem(key, 'true');
      }
    }
  };

  const dismissInstall = () => {
    setIsStandalone(true);
    setDeferredPrompt(null);
    const key = window.location.pathname.startsWith('/admin') ? 'pwa_installed_admin' : 'pwa_installed';
    localStorage.setItem(key, 'true');
  };

  return (
    <PWAInstallContext.Provider value={{
      isInstallable: !!deferredPrompt,
      isIOS,
      isStandalone,
      promptInstall,
      dismissInstall
    }}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  return useContext(PWAInstallContext);
}
