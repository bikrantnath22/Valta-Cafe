// src/pages/admin/AdminSettingsPage.jsx — edit the singleton SiteSettings.
// Cafe name, logo, opening hours, manual open/closed switch, closed message,
// delivery fee/radius, and contact info. Saving refreshes the shared settings
// store so the customer-facing UI updates immediately.
import { useCallback, useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../lib/api.js';
import { useSettings } from '../../store/settingsStore.js';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import ImageUploader from '../../components/shared/ImageUploader.jsx';

export default function AdminSettingsPage() {
  const refreshSettingsStore = useSettings((s) => s.fetch);
  const pushObj = usePushNotifications();

  const [form, setForm] = useState(null);
  const [logoImages, setLogoImages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { settings, isOpen: open } = await getSettings();
      setForm({
        cafeName: settings.cafeName || '',
        start: settings.openingHours?.start || '09:00',
        end: settings.openingHours?.end || '21:00',
        isManuallyClosed: Boolean(settings.isManuallyClosed),
        closedMessage: settings.closedMessage || '',
        deliveryFee: String(settings.deliveryFee ?? 0),
        estimatedDeliveryTime: settings.estimatedDeliveryTime || '40-45 min',
        estimatedPickupTime: settings.estimatedPickupTime || '10-15 min',
        phone: settings.contactInfo?.phone || '',
        email: settings.contactInfo?.email || '',
        address: settings.contactInfo?.address || '',
      });
      setLogoImages(settings.logo?.url ? [{ url: settings.logo.url, public_id: settings.logo.public_id }] : []);
      setIsOpen(Boolean(open));
    } catch (err) {
      setError(err.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.cafeName.trim()) return setSaveError('Cafe name is required.');
    const fee = Number(form.deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) return setSaveError('Delivery fee must be 0 or more.');

    const payload = {
      cafeName: form.cafeName.trim(),
      logo: logoImages[0] ? { url: logoImages[0].url, public_id: logoImages[0].public_id } : {},
      openingHours: { start: form.start, end: form.end },
      isManuallyClosed: form.isManuallyClosed,
      closedMessage: form.closedMessage.trim(),
      deliveryFee: fee,
      estimatedDeliveryTime: form.estimatedDeliveryTime.trim(),
      estimatedPickupTime: form.estimatedPickupTime.trim(),
      contactInfo: { phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim() },
    };

    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const { isOpen: open } = await updateSettings(payload);
      setIsOpen(Boolean(open));
      setSaved(true);
      refreshSettingsStore(); // keep the customer-facing store in sync
    } catch (err) {
      setSaveError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400">
        <span className="animate-pulse">Loading settings…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Site Settings</h1>
          <p className="text-sm text-stone-500">Configure how the cafe appears and operates.</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            isOpen ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          Currently {isOpen ? 'Open' : 'Closed'}
        </span>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding */}
        <Section title="Branding">
          <Field label="Cafe name">
            <input
              value={form.cafeName}
              onChange={(e) => set({ cafeName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Logo" hint="The first image is used as the logo.">
            <ImageUploader value={logoImages} onChange={setLogoImages} />
          </Field>
        </Section>

        {/* Availability */}
        <Section title="Availability">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opens at">
              <input type="time" value={form.start} onChange={(e) => set({ start: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Closes at">
              <input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2.5">
            <span className="text-sm font-medium text-stone-700">
              Manually mark cafe as closed
              <span className="block text-xs font-normal text-stone-500">
                When on, the cafe shows as closed regardless of opening hours.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.isManuallyClosed}
              onChange={(e) => set({ isManuallyClosed: e.target.checked })}
              className="h-5 w-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
          </label>
          <Field label="Closed message" hint="Shown to customers whenever the cafe is closed.">
            <textarea
              value={form.closedMessage}
              onChange={(e) => set({ closedMessage: e.target.value })}
              rows={2}
              className={inputClass}
            />
          </Field>
        </Section>

        {/* Delivery & Pickup Times */}
        <Section title="Delivery & Pickup">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Delivery fee (₹)">
              <input type="number" min="0" step="1" value={form.deliveryFee} onChange={(e) => set({ deliveryFee: e.target.value })} className={inputClass} />
            </Field>
            <div className="hidden md:block"></div>
            <Field label="Est. Delivery Time" hint="e.g. '40-45 min'">
              <input value={form.estimatedDeliveryTime} onChange={(e) => set({ estimatedDeliveryTime: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Est. Pickup Time for Immediately" hint="e.g. '10-15 min'">
              <input value={form.estimatedPickupTime} onChange={(e) => set({ estimatedPickupTime: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact">
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Address">
            <textarea value={form.address} onChange={(e) => set({ address: e.target.value })} rows={2} className={inputClass} />
          </Field>
        </Section>

        {saveError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{saveError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-sm font-medium text-green-700">Saved.</span>}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-stone-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}
