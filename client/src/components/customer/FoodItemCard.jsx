// src/components/customer/FoodItemCard.jsx — one menu item.
// Shows the image carousel, veg/non-veg badge, price, and an add-to-cart
// control. Unavailable items are greyed out and labelled; when the cafe is
// closed the add control is disabled everywhere.
import ImageCarousel from './ImageCarousel.jsx';
import { useCart } from '../../store/cartStore.js';
import { useSettings } from '../../store/settingsStore.js';
import { formatCurrency } from '../../lib/validation.js';

export default function FoodItemCard({ item, readOnly = false }) {
  const isOpen = useSettings((s) => s.isOpen);
  const add = useCart((s) => s.add);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const qty = useCart((s) => s.items.find((i) => i.foodItemId === item._id)?.quantity || 0);

  const unavailable = !item.isAvailable;
  const canOrder = isOpen && !unavailable;

  const handleAdd = () => {
    add({
      foodItemId: item._id,
      name: item.name,
      price: item.price,
      image: item.images?.[0]?.url || '',
      isVeg: item.isVeg,
      isAvailable: true,
    });
  };

  return (
    <div
      className={`relative flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100 transition-all duration-200 hover:shadow-md ${
        unavailable ? 'opacity-60 grayscale-[0.2]' : ''
      }`}
    >
      {/* Left side: Details */}
      <div className="flex min-w-0 flex-1 flex-col pb-2">
        <div className="flex items-start gap-2 mb-1">
          <VegBadge isVeg={item.isVeg} />
          {item.isBestSeller && (
            <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800">
              🔥 Bestseller
            </span>
          )}
        </div>
        
        <h3 className="text-sm font-bold leading-tight text-stone-900 line-clamp-2">{item.name}</h3>
        <span className="mt-1 text-sm font-semibold text-stone-800">{formatCurrency(item.price)}</span>

        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500">{item.description}</p>
        )}
      </div>

      {/* Right side: Image and Floating Button */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className="relative overflow-hidden rounded-lg bg-stone-50 h-28 w-28 shadow-inner">
          <ImageCarousel
            images={item.images}
            alt={item.name}
            className="h-full w-full object-cover"
          />
          {unavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/40 backdrop-blur-[1px]">
              <span className="rounded bg-stone-900/80 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Floating Add Control */}
        {!readOnly && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24">
            {unavailable ? (
              <div className="rounded-lg border border-stone-200 bg-stone-100 py-1.5 text-center text-[10px] font-bold text-stone-400 shadow-sm">
                UNAVAILABLE
              </div>
            ) : qty > 0 ? (
              <div className="flex h-8 items-center justify-between overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm ring-1 ring-amber-500/10">
                <button
                  type="button"
                  onClick={() => dec(item._id)}
                  aria-label={`Remove one ${item.name}`}
                  className="flex h-full w-1/3 items-center justify-center text-base font-bold text-amber-600 transition hover:bg-amber-50 active:bg-amber-100"
                >
                  −
                </button>
                <span className="w-1/3 text-center text-xs font-bold text-amber-700">{qty}</span>
                <button
                  type="button"
                  onClick={() => inc(item._id)}
                  aria-label={`Add one more ${item.name}`}
                  className="flex h-full w-1/3 items-center justify-center text-base font-bold text-amber-600 transition hover:bg-amber-50 active:bg-amber-100"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!canOrder}
                title={!isOpen ? 'The cafe is currently closed' : undefined}
                className="group relative flex h-7 w-full items-center justify-center overflow-hidden rounded-lg border border-amber-200 bg-white text-xs font-bold text-amber-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                ADD
                <span className="absolute right-1 top-1 text-[9px] font-bold text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">+</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Square veg/non-veg indicator used across Indian menus. */
function VegBadge({ isVeg }) {
  const color = isVeg ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600';
  return (
    <span
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${color}`}
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={`h-2 w-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </span>
  );
}
