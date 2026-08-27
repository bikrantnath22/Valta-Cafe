// src/lib/api.js — tiny fetch wrapper around the VALTA Cafe API.
// Base URL comes from Vite env (VITE_API_URL), defaulting to the local server.
// Auth uses an httpOnly cookie set by the server, so every request includes
// credentials and we never handle the token in JS.

const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = RAW_BASE === '/api' ? '' : RAW_BASE;

/**
 * Fetch JSON from the API. Throws on non-2xx responses.
 * @param {string} path - path beginning with "/", e.g. "/api/health"
 * @param {RequestInit} [options]
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && body?.message ? body.message : `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

/** GET /api/health */
export function getHealth() {
  return apiFetch('/api/health');
}

// --- Auth --------------------------------------------------------------------

/** Full-page URL that starts the Google OAuth flow. */
export function googleLoginUrl() {
  return `${API_BASE_URL}/api/auth/google`;
}

/** GET /api/auth/me → the current user, or null if not authenticated. */
export async function getMe() {
  try {
    const body = await apiFetch('/api/auth/me');
    return body.user ?? null;
  } catch (err) {
    if (err.status === 401 || err.status === 403) return null;
    throw err;
  }
}

/** POST /api/auth/logout */
export function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}

// --- Uploads -----------------------------------------------------------------

/**
 * Upload a single image to POST /api/upload with per-file progress.
 * Uses XMLHttpRequest (fetch can't report upload progress).
 * @param {File} file
 * @param {{ onProgress?: (percent:number)=>void, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ url: string, public_id: string }>}
 */
export function uploadImage(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/upload`);
    xhr.withCredentials = true; // send the auth cookie

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.images?.[0]) {
        resolve(body.images[0]);
      } else {
        const err = new Error(body?.message || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    const form = new FormData();
    form.append('images', file);
    xhr.send(form);
  });
}

/**
 * DELETE /api/upload/:publicId — remove an asset from Cloudinary.
 * The public_id contains slashes, so it must be URL-encoded.
 * @param {string} publicId
 */
export function deleteImage(publicId) {
  return apiFetch(`/api/upload/${encodeURIComponent(publicId)}`, { method: 'DELETE' });
}

// --- Settings ----------------------------------------------------------------

/** GET /api/settings → { settings, isOpen } (public). */
export function getSettings() {
  return apiFetch('/api/settings');
}

// --- Menu --------------------------------------------------------------------

/** GET /api/menu → { categories, items } (public). */
export function getMenu() {
  return apiFetch('/api/menu');
}

// --- Saved addresses (auth) --------------------------------------------------

/** GET /api/addresses → { addresses }. */
export function listAddresses() {
  return apiFetch('/api/addresses');
}

/** POST /api/addresses */
export function addAddress(payload) {
  return apiFetch('/api/addresses', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /api/addresses/:id */
export function updateAddress(id, payload) {
  return apiFetch(`/api/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** DELETE /api/addresses/:id */
export function deleteAddress(id) {
  return apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
}

// --- Orders (auth) -----------------------------------------------------------

/** POST /api/orders — place an order. */
export function createOrder(payload) {
  return apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
}

/** GET /api/orders → { orders } (current user's, newest first). */
export function listOrders() {
  return apiFetch('/api/orders');
}

/** GET /api/orders/:id → { order }. */
export function getOrder(id) {
  return apiFetch(`/api/orders/${id}`);
}

// --- Admin: orders (staff) ---------------------------------------------------

/** GET /api/orders/admin/all → { orders } (all orders, newest first, customer populated). */
export function listAllOrders() {
  return apiFetch('/api/orders/admin/all');
}

/** PATCH /api/orders/:id/status — body { status?, paymentStatus? }. */
export function updateOrderStatus(id, payload) {
  return apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
}

// --- Admin: categories (staff) -----------------------------------------------

/** GET /api/categories → { categories } (with itemCount). */
export function adminListCategories() {
  return apiFetch('/api/categories');
}

/** POST /api/categories */
export function createCategory(payload) {
  return apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /api/categories/:id */
export function updateCategory(id, payload) {
  return apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** DELETE /api/categories/:id */
export function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
}

/** PATCH /api/categories/reorder — body { ids: [orderedId, ...] }. */
export function reorderCategories(ids) {
  return apiFetch('/api/categories/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) });
}

// --- Admin: food items (staff) -----------------------------------------------

/** GET /api/food-items → { items } (all items incl. unavailable, category populated). */
export function adminListFoodItems() {
  return apiFetch('/api/food-items');
}

/** POST /api/food-items */
export function createFoodItem(payload) {
  return apiFetch('/api/food-items', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /api/food-items/:id */
export function updateFoodItem(id, payload) {
  return apiFetch(`/api/food-items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** DELETE /api/food-items/:id */
export function deleteFoodItem(id) {
  return apiFetch(`/api/food-items/${id}`, { method: 'DELETE' });
}

// --- Admin: settings (staff) -------------------------------------------------

/** PATCH /api/settings → { settings, isOpen }. */
export function updateSettings(payload) {
  return apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(payload) });
}

// --- Admin: analytics (staff) ------------------------------------------------

/** GET /api/analytics/overview → { analytics }. */
export function getAnalyticsOverview() {
  return apiFetch('/api/analytics/overview');
}

// --- Admin: users (superadmin) -----------------------------------------------

/** GET /api/users → { users }. */
export function listUsers() {
  return apiFetch('/api/users');
}

/** PATCH /api/users/:id/role — body { role }. */
export function updateUserRole(id, role) {
  return apiFetch(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

/** PATCH /api/users/:id/active — body { isActive }. */
export function updateUserActive(id, isActive) {
  return apiFetch(`/api/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

// --- Notifications (staff) ---------------------------------------------------

/** GET /api/notifications → { notifications } */
export function getNotifications() {
  return apiFetch('/api/notifications');
}

/** PATCH /api/notifications/read-all */
export function markNotificationsRead() {
  return apiFetch('/api/notifications/read-all', { method: 'PATCH' });
}

export { API_BASE_URL };
