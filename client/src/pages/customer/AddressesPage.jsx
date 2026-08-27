// src/pages/customer/AddressesPage.jsx — the "Account" tab: manage saved
// delivery addresses (add / edit / delete / set default). Auth-gated by the
// route, so we can assume a signed-in user here.
import { useEffect, useState } from 'react';
import { listAddresses, addAddress, updateAddress, deleteAddress } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AddressCard from '../../components/customer/AddressCard.jsx';
import AddressForm from '../../components/customer/AddressForm.jsx';

export default function AddressesPage() {
  const { user, signOut } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState({ type: 'none' }); // none | add | { type:'edit', id }
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listAddresses();
        if (active) setAddresses(data.addresses || []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async (payload) => {
    setSaving(true);
    setError(null);
    try {
      const data = await addAddress(payload);
      setAddresses(data.addresses || []);
      setMode({ type: 'none' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, payload) => {
    setSaving(true);
    setError(null);
    try {
      const data = await updateAddress(id, payload);
      setAddresses(data.addresses || []);
      setMode({ type: 'none' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id) => {
    setBusyId(id);
    setError(null);
    try {
      const data = await updateAddress(id, { isDefault: true });
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    setBusyId(id);
    setError(null);
    try {
      const data = await deleteAddress(id);
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">Account</h1>
      {user && (
        <p className="mt-0.5 text-sm text-stone-500">
          {user.name}
          {user.email ? ` · ${user.email}` : ''}
        </p>
      )}

      <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-stone-500">
        Saved addresses
      </h2>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) =>
            mode.type === 'edit' && mode.id === addr._id ? (
              <AddressForm
                key={addr._id}
                initial={addr}
                busy={saving}
                onSubmit={(payload) => handleUpdate(addr._id, payload)}
                onCancel={() => setMode({ type: 'none' })}
              />
            ) : (
              <AddressCard
                key={addr._id}
                address={addr}
                busy={busyId === addr._id}
                onEdit={() => setMode({ type: 'edit', id: addr._id })}
                onSetDefault={() => handleSetDefault(addr._id)}
                onDelete={() => handleDelete(addr._id)}
              />
            )
          )}

          {addresses.length === 0 && mode.type !== 'add' && (
            <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-stone-500">
              You haven't saved any addresses yet.
            </p>
          )}

          {mode.type === 'add' ? (
            <AddressForm
              busy={saving}
              onSubmit={handleAdd}
              onCancel={() => setMode({ type: 'none' })}
            />
          ) : (
            <button
              type="button"
              onClick={() => setMode({ type: 'add' })}
              className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              + Add a new address
            </button>
          )}
        </div>
      )}

      {user && (
        <div className="mt-8 border-t border-stone-200 pt-6 pb-2 text-center">
          <button
            onClick={signOut}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 hover:border-rose-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
