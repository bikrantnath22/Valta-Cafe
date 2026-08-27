// components/shared/ImageUploader.jsx
// Reusable multi-image uploader for the food-item form.
//
// Features:
//   • drag-and-drop OR click-to-select (multiple files)
//   • per-image upload progress (each file is its own request)
//   • drag-to-reorder tiles
//   • remove before saving — deletes uploaded assets from Cloudinary,
//     or aborts an in-flight upload
//   • client-side validation: max 4 images, 3 MB each, images only
//
// Controlled-ish: seeds its list once from `value` ([{url, public_id}]) and
// reports the ordered list of *uploaded* images back through `onChange`.
import { useEffect, useRef, useState } from 'react';
import { uploadImage, deleteImage } from '../../lib/api.js';

// Keep these in sync with the server (middleware/upload.js).
export const MAX_FILES = 4;
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const makeId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));

/**
 * @param {object}   props
 * @param {{url:string, public_id:string}[]} [props.value]     initial images
 * @param {(images:{url:string, public_id:string}[])=>void} [props.onChange]  ordered uploaded images
 * @param {boolean}  [props.disabled]  disable adding/removing/reordering
 */
export default function ImageUploader({ value = [], onChange, disabled = false }) {
  // Each item: { id, status:'uploading'|'done'|'error', file?, previewUrl,
  //              url?, public_id?, progress, error? }
  const [items, setItems] = useState(() =>
    (value || []).map((v) => ({
      id: makeId(),
      status: 'done',
      previewUrl: v.url,
      url: v.url,
      public_id: v.public_id,
      progress: 100,
      error: null,
    }))
  );
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [overIndex, setOverIndex] = useState(null);

  const inputRef = useRef(null);
  const controllersRef = useRef(new Map()); // id -> AbortController
  const objectUrlsRef = useRef(new Set()); // blob: URLs to revoke
  const dragIndexRef = useRef(null);

  // Keep the latest onChange without re-triggering the emit effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Emit the ordered list of uploaded images whenever it actually changes.
  const lastSigRef = useRef(null);
  useEffect(() => {
    const uploaded = items
      .filter((it) => it.status === 'done' && it.public_id)
      .map((it) => ({ url: it.url, public_id: it.public_id }));
    const sig = JSON.stringify(uploaded);
    if (lastSigRef.current === null) {
      // First run: sync baseline so we don't fire onChange for the seed value.
      lastSigRef.current = sig;
      return;
    }
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      onChangeRef.current?.(uploaded);
    }
  }, [items]);

  // Clean up in-flight requests and object URLs on unmount.
  useEffect(() => {
    const controllers = controllersRef.current;
    const urls = objectUrlsRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  function startUpload(item) {
    const controller = new AbortController();
    controllersRef.current.set(item.id, controller);
    uploadImage(item.file, {
      signal: controller.signal,
      onProgress: (pct) =>
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: pct } : it))),
    })
      .then(({ url, public_id }) => {
        controllersRef.current.delete(item.id);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'done', url, public_id, progress: 100 } : it
          )
        );
      })
      .catch((err) => {
        controllersRef.current.delete(item.id);
        if (err?.name === 'AbortError') return; // removed by the user
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'error', error: err?.message || 'Upload failed' } : it
          )
        );
      });
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const problems = [];
    const valid = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        problems.push(`"${file.name}" isn't a supported image (JPEG, PNG, WebP, GIF).`);
      } else if (file.size > MAX_FILE_SIZE) {
        problems.push(`"${file.name}" is larger than 3 MB.`);
      } else {
        valid.push(file);
      }
    }

    const slotsLeft = Math.max(0, MAX_FILES - items.length);
    let toAdd = valid;
    if (valid.length > slotsLeft) {
      toAdd = valid.slice(0, slotsLeft);
      problems.push(`You can upload at most ${MAX_FILES} images — ${valid.length - toAdd.length} skipped.`);
    }

    setNotice(problems.join(' '));
    if (toAdd.length === 0) return;

    const newItems = toAdd.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      return {
        id: makeId(),
        status: 'uploading',
        file,
        previewUrl,
        url: null,
        public_id: null,
        progress: 0,
        error: null,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach(startUpload);
  }

  function removeItem(id) {
    if (disabled) return;
    const item = items.find((it) => it.id === id);
    if (!item) return;

    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(id);
    }

    // If it made it to Cloudinary, remove it there too (best-effort).
    if (item.status === 'done' && item.public_id) {
      deleteImage(item.public_id).catch((e) =>
        console.error('Failed to delete image from Cloudinary:', e?.message || e)
      );
    }

    if (item.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
      objectUrlsRef.current.delete(item.previewUrl);
    }

    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function retry(id) {
    const item = items.find((it) => it.id === id);
    if (!item || !item.file) return;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: 'uploading', progress: 0, error: null } : it))
    );
    startUpload(item);
  }

  // --- File input / drop zone ---
  function onInputChange(e) {
    addFiles(e.target.files);
    e.target.value = ''; // allow re-selecting the same file
  }

  function onZoneDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }

  // --- Reordering (native HTML5 drag-and-drop between tiles) ---
  function onTileDragStart(e, index) {
    if (disabled) return;
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index)); // Firefox needs data set
  }

  function onTileDragOver(e, index) {
    if (disabled || dragIndexRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  }

  function onTileDrop(e, index) {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setOverIndex(null);
    if (from === null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  }

  function onTileDragEnd() {
    dragIndexRef.current = null;
    setOverIndex(null);
  }

  const atMax = items.length >= MAX_FILES;

  return (
    <div className="w-full">
      {/* Image tiles */}
      {items.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={!disabled}
              onDragStart={(e) => onTileDragStart(e, index)}
              onDragOver={(e) => onTileDragOver(e, index)}
              onDrop={(e) => onTileDrop(e, index)}
              onDragEnd={onTileDragEnd}
              className={[
                'group relative aspect-square overflow-hidden rounded-xl ring-1 ring-stone-200 bg-stone-100',
                !disabled ? 'cursor-move' : '',
                overIndex === index ? 'ring-2 ring-amber-500' : '',
              ].join(' ')}
              title={disabled ? undefined : 'Drag to reorder'}
            >
              <img
                src={item.previewUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />

              {/* Order badge */}
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {index + 1}
              </span>

              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove image"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-rose-600 focus:opacity-100 focus:outline-none group-hover:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M2 2l8 8M10 2l-8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}

              {/* Uploading overlay + progress */}
              {item.status === 'uploading' && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-white">{item.progress}%</p>
                </div>
              )}

              {/* Error overlay */}
              {item.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-900/70 p-2 text-center">
                  <p className="text-[10px] font-medium text-white">{item.error}</p>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-white"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Drop zone / file picker */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        hidden
        onChange={onInputChange}
        disabled={disabled || atMax}
      />

      {atMax ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm text-stone-500">
          Maximum of {MAX_FILES} images reached. Remove one to add another.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onZoneDrop}
          disabled={disabled}
          className={[
            'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
            'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            isDragging
              ? 'border-amber-500 bg-amber-50'
              : 'border-stone-300 bg-white hover:border-amber-400 hover:bg-amber-50/50',
          ].join(' ')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-amber-600">
            <path
              d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold text-stone-700">
            Drag &amp; drop images, or click to browse
          </span>
          <span className="text-xs text-stone-500">
            PNG, JPG, WebP or GIF · up to 3 MB each · {items.length}/{MAX_FILES} used
          </span>
        </button>
      )}

      {notice && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {notice}
        </p>
      )}
    </div>
  );
}
