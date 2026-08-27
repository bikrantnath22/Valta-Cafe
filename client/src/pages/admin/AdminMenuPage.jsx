// src/pages/admin/AdminMenuPage.jsx — full CRUD for menu items.
// Uses the shared Cloudinary ImageUploader for item photos and an availability
// toggle that reflects instantly on the customer menu. Filter by category and
// search by name.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminListFoodItems,
  adminListCategories,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
} from '../../lib/api.js';
import ImageUploader from '../../components/shared/ImageUploader.jsx';
import ImageCarousel from '../../components/customer/ImageCarousel.jsx';
import { formatCurrency } from '../../lib/validation.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isVeg: false,
  isAvailable: true,
  isBestSeller: false,
  images: [],
};

/** Resolve a category id from an item whose categoryId may be populated or raw. */
function catIdOf(item) {
  const c = item.categoryId;
  return c && typeof c === 'object' ? String(c._id) : String(c || '');
}

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited, or null for create
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, catsRes] = await Promise.all([adminListFoodItems(), adminListCategories()]);
      setItems(itemsRes.items || []);
      setCategories(catsRes.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load the menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryNameById = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(String(c._id), c.name);
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== 'all' && catIdOf(it) !== categoryFilter) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, categoryFilter, search]);

  function openCreate() {
    if (categories.length === 0) {
      setActionError('Create at least one category before adding items.');
      return;
    }
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: String(categories[0]._id) });
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      categoryId: catIdOf(item),
      isVeg: Boolean(item.isVeg),
      isAvailable: Boolean(item.isAvailable),
      isBestSeller: Boolean(item.isBestSeller),
      images: (item.images || []).map((im) => ({ url: im.url, public_id: im.public_id })),
    });
    setFormError('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function submitForm(e) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim()) return setFormError('An item name is required.');
    if (!Number.isFinite(price) || price < 0) return setFormError('Enter a valid price (0 or more).');
    if (!form.categoryId) return setFormError('Choose a category.');
    if (!form.images || form.images.length === 0) return setFormError('Add at least one image.');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      categoryId: form.categoryId,
      isVeg: form.isVeg,
      isAvailable: form.isAvailable,
      isBestSeller: form.isBestSeller,
      images: form.images,
    };

    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const { item } = await updateFoodItem(editing._id, payload);
        setItems((prev) => prev.map((it) => (it._id === editing._id ? item : it)));
      } else {
        const { item } = await createFoodItem(payload);
        setItems((prev) => [item, ...prev]);
      }
      closeForm();
    } catch (err) {
      setFormError(err.message || 'Could not save the item.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    setTogglingId(item._id);
    setActionError('');
    try {
      const { item: updated } = await updateFoodItem(item._id, { isAvailable: !item.isAvailable });
      setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, isAvailable: updated.isAvailable } : it)));
    } catch (err) {
      setActionError(err.message || 'Could not update availability.');
    } finally {
      setTogglingId(null);
    }
  }

  async function toggleBestSeller(item) {
    setTogglingId(item._id);
    setActionError('');
    try {
      const { item: updated } = await updateFoodItem(item._id, { isBestSeller: !item.isBestSeller });
      setItems((prev) => prev.map((it) => (it._id === item._id ? { ...it, isBestSeller: updated.isBestSeller } : it)));
    } catch (err) {
      setActionError(err.message || 'Could not update best seller status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? This also removes its images.`)) return;
    setActionError('');
    try {
      await deleteFoodItem(item._id);
      setItems((prev) => prev.filter((it) => it._id !== item._id));
    } catch (err) {
      setActionError(err.message || 'Could not delete the item.');
    }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Menu Items</h1>
          <p className="text-sm text-stone-500">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length} item(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          + Add item
        </button>
      </header>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={String(c._id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {actionError}
        </p>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-stone-400">
          <span className="animate-pulse">Loading menu…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-500">
          No items match your filters.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li
              key={item._id}
              className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
            >
              <div className="relative aspect-video bg-stone-100 overflow-hidden">
                <ImageCarousel images={item.images} alt={item.name} className="h-full w-full absolute inset-0" />
                {!item.isAvailable && (
                  <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-xs font-semibold text-white">
                    Unavailable
                  </span>
                )}
                <div className="absolute right-2 top-2 flex flex-col gap-2 items-end">
                  {item.isBestSeller && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                      ★ Best Seller
                    </span>
                  )}
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ${
                      item.isVeg ? 'bg-green-600' : 'bg-rose-600'
                    }`}
                    title={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                  >
                    <span className="block h-2 w-2 rounded-full bg-white" />
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-stone-900">{item.name}</p>
                  <p className="whitespace-nowrap font-semibold text-amber-700">{formatCurrency(item.price)}</p>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  {categoryNameById.get(catIdOf(item)) || 'Uncategorized'}
                </p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                  <div className="flex flex-col gap-2">
                    <AvailabilityToggle
                      on={item.isAvailable}
                      busy={togglingId === item._id}
                      onToggle={() => toggleAvailability(item)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleBestSeller(item)}
                      disabled={togglingId === item._id}
                      className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-amber-600 disabled:opacity-50"
                    >
                      <span className={`text-sm ${item.isBestSeller ? 'text-amber-500' : 'text-stone-300'}`}>★</span>
                      {item.isBestSeller ? 'Best Seller On' : 'Mark Best Seller'}
                    </button>
                  </div>
                  <div className="flex gap-1.5 self-end">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-stone-300 px-2.5 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-lg border border-stone-300 px-2.5 py-1 text-sm font-medium text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <ItemFormModal
          editing={editing}
          form={form}
          setForm={setForm}
          categories={categories}
          saving={saving}
          formError={formError}
          onClose={closeForm}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}

function AvailabilityToggle({ on, busy, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      role="switch"
      aria-checked={on}
      className="flex items-center gap-2 text-sm disabled:opacity-50"
      title="Toggle availability"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          on ? 'bg-green-500' : 'bg-stone-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className={on ? 'font-medium text-green-700' : 'text-stone-500'}>
        {on ? 'Available' : 'Off'}
      </span>
    </button>
  );
}

function ItemFormModal({ editing, form, setForm, categories, saving, formError, onClose, onSubmit }) {
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-bold text-stone-900">{editing ? 'Edit item' : 'Add item'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Price (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {categories.map((c) => (
                  <option key={c._id} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.isVeg}
                onChange={(e) => set({ isVeg: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => set({ isAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Available
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <input
                type="checkbox"
                checked={form.isBestSeller}
                onChange={(e) => set({ isBestSeller: e.target.checked })}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              ★ Best Seller
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Images</label>
            <ImageUploader
              key={editing?._id || 'new'}
              value={form.images}
              onChange={(images) => set({ images })}
            />
          </div>

          {formError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
