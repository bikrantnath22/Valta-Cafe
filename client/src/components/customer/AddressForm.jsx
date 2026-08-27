// src/components/customer/AddressForm.jsx — add / edit a saved address.
// Required: address text + phone (validated client-side, mirrored on server).
// Optional: label, and lat/lng captured via the browser Geolocation API. If the
// user denies location or it's unavailable, the form still submits fine — we
// NEVER block on missing coordinates.
import { useState } from 'react';
import { isValidPhone } from '../../lib/validation.js';

export default function AddressForm({ initial = null, onSubmit, onCancel, busy = false }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [lat, setLat] = useState(initial?.lat ?? null);
  const [lng, setLng] = useState(initial?.lng ?? null);
  const [isDefault, setIsDefault] = useState(Boolean(initial?.isDefault));

  const [errors, setErrors] = useState({});
  const validate = () => {
    const next = {};
    if (!address.trim()) {
      next.address = 'Please enter your delivery address.';
    } else if (address.trim().length < 4) {
      next.address = 'Please enter a complete delivery address (at least 4 characters).';
    }
    if (!phone.trim()) next.phone = 'A phone number is required.';
    else if (!isValidPhone(phone)) next.phone = 'Enter a valid 10-digit phone number.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      label: label.trim(),
      address: address.trim(),
      phone: phone.trim(),
      isDefault,
    };
    // Only include coords when we actually have them.
    if (typeof lat === 'number' && typeof lng === 'number') {
      payload.lat = lat;
      payload.lng = lng;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Home, Work, …"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Delivery address <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="House / flat no., street, area, landmark"
          className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
            errors.address
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-stone-300 focus:border-amber-500 focus:ring-amber-500'
          }`}
        />
        {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Phone number <span className="text-rose-500">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
            errors.phone
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-stone-300 focus:border-amber-500 focus:ring-amber-500'
          }`}
        />
        {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700 mt-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
        Set as my default address
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Save address'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
