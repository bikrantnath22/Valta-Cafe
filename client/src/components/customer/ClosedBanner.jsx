// src/components/customer/ClosedBanner.jsx — app-wide "cafe is closed" notice.
import { useSettings } from '../../store/settingsStore.js';

export default function ClosedBanner() {
  const { loading, isOpen, settings } = useSettings();

  if (loading || isOpen) return null;

  const message =
    settings?.closedMessage || "We're currently closed. Please check back during our opening hours.";

  return (
    <div
      role="status"
      className="flex items-start gap-2 bg-rose-600 px-4 py-2.5 text-sm text-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-medium">{message}</p>
    </div>
  );
}
