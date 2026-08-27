import { useState } from 'react';
import { usePWAInstall } from '../../context/PWAInstallContext.jsx';

export default function PWAInstallPrompt({ appName = "VALTA Cafe" }) {
  const { isInstallable, isIOS, isStandalone, promptInstall, dismissInstall } = usePWAInstall();

  // If already installed, or user dismissed, don't show anything.
  if (isStandalone) return null;

  return (
    <>
      {/* Android / Desktop Install Banner */}
      {isInstallable && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-xl bg-white p-4 shadow-xl ring-1 ring-stone-900/10 md:bottom-6 md:left-auto md:right-6 md:w-80">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">Install {appName}</p>
              <p className="text-xs text-stone-500">For a faster experience.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0 ml-4">
            <button
              onClick={promptInstall}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              Install
            </button>
            <button
              onClick={dismissInstall}
              className="text-[10px] font-medium text-stone-400 hover:text-stone-600"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* iOS Manual Install Banner */}
      {isIOS && !isInstallable && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col rounded-xl bg-white p-4 shadow-xl ring-1 ring-stone-900/10 md:bottom-6 md:left-auto md:right-6 md:w-80">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">Install {appName}</p>
                <p className="text-xs text-stone-500">Add to your iPhone.</p>
              </div>
            </div>
            <button onClick={dismissInstall} className="text-stone-400 hover:text-stone-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="mt-2 text-xs font-medium text-stone-600 flex flex-col gap-1.5 bg-stone-50 p-2 rounded-lg">
             <span className="flex items-center gap-1.5">1. Tap the <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share button.</span>
             <span className="flex items-center gap-1.5">2. Select <span className="bg-white px-1.5 py-0.5 rounded shadow-sm border border-stone-200">Add to Home Screen</span></span>
          </div>
        </div>
      )}
    </>
  );
}
