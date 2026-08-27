// src/pages/admin/AdminCategoriesPage.jsx — create/edit/delete/reorder categories.
// Categories with items cannot be deleted (server enforces this too). Reordering
// is optimistic and persisted via PATCH /api/categories/reorder.
import { useCallback, useEffect, useState } from 'react';
import {
  adminListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../../lib/api.js';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { categories: data } = await adminListCategories();
      setCategories(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setActionError('');
    try {
      const { category } = await createCategory({
        name: newName.trim(),
        description: newDescription.trim(),
      });
      setCategories((prev) => [...prev, { ...category, itemCount: 0 }]);
      setNewName('');
      setNewDescription('');
    } catch (err) {
      setActionError(err.message || 'Could not create category.');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat) {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setActionError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    setSavingId(id);
    setActionError('');
    try {
      const { category } = await updateCategory(id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setCategories((prev) =>
        prev.map((c) => (c._id === id ? { ...c, name: category.name, description: category.description } : c))
      );
      cancelEdit();
    } catch (err) {
      setActionError(err.message || 'Could not save category.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(cat) {
    if (cat.itemCount > 0) return;
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    setBusy(true);
    setActionError('');
    try {
      await deleteCategory(cat._id);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
    } catch (err) {
      setActionError(err.message || 'Could not delete category.');
    } finally {
      setBusy(false);
    }
  }

  async function move(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    setBusy(true);
    setActionError('');
    try {
      await reorderCategories(next.map((c) => c._id));
    } catch (err) {
      setActionError(err.message || 'Could not reorder — reverting.');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-stone-900">Categories</h1>
        <p className="text-sm text-stone-500">Group menu items and control their display order.</p>
      </header>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-stone-700">Add a category</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name (e.g. Beverages)"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:max-w-xs"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {creating ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

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
          <span className="animate-pulse">Loading…</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-500">
          No categories yet. Add your first one above.
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat, index) => (
            <li
              key={cat._id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              {/* Reorder controls */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={busy || index === 0}
                  aria-label="Move up"
                  className="rounded p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={busy || index === categories.length - 1}
                  aria-label="Move down"
                  className="rounded p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              {editingId === cat._id ? (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:max-w-xs"
                  />
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(cat._id)}
                      disabled={savingId === cat._id || !editName.trim()}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{cat.name}</p>
                    {cat.description && <p className="text-sm text-stone-500">{cat.description}</p>}
                  </div>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {cat.itemCount} item{cat.itemCount === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    disabled={busy || cat.itemCount > 0}
                    title={cat.itemCount > 0 ? 'Move or delete its items first' : 'Delete category'}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
