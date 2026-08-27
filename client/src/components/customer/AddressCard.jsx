// src/components/customer/AddressCard.jsx — one saved address with actions.
export default function AddressCard({ address, onEdit, onDelete, onSetDefault, busy = false }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {address.label && (
              <span className="text-sm font-semibold text-stone-900">{address.label}</span>
            )}
            {address.isDefault && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{address.address}</p>
          <p className="mt-1 text-xs text-stone-500">{address.phone}</p>
          {typeof address.lat === 'number' && typeof address.lng === 'number' && (
            <p className="mt-0.5 text-[11px] text-stone-400">
              📍 {address.lat}, {address.lng}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {!address.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={busy}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
          >
            Set as default
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
