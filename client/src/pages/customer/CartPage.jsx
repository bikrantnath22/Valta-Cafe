// src/pages/customer/CartPage.jsx — review the cart before checkout.
// Quantity steppers, per-line remove, and an order summary (subtotal +
// delivery fee + total). Checkout is blocked when the cafe is closed or the
// cart is empty.
import { Link, useNavigate } from 'react-router-dom';
import { useCart, selectSubtotal } from '../../store/cartStore.js';
import { useSettings } from '../../store/settingsStore.js';
import { formatCurrency } from '../../lib/validation.js';

export default function CartPage() {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart(selectSubtotal);

  const isOpen = useSettings((s) => s.isOpen);
  const settings = useSettings((s) => s.settings);
  const deliveryFee = settings?.deliveryFee || 0;
  const total = subtotal + deliveryFee;

  const hasUnavailableItems = items.some((item) => item.isAvailable === false);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50 text-4xl shadow-inner">
          🛒
        </div>
        <p className="text-xl font-bold text-stone-900">Your cart is empty</p>
        <p className="mt-2 max-w-[250px] text-sm text-stone-500">Looks like you haven't added anything to your cart yet.</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-stone-800 hover:shadow-lg active:scale-95"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <h1 className="mb-6 text-2xl font-black tracking-tight text-stone-900">Your Cart</h1>

      <div className="space-y-2">
        {items.map((item) => {
          const isUnavailable = item.isAvailable === false;
          
          return (
          <div
            key={item.foodItemId}
            className={`flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100 ${isUnavailable ? 'opacity-60 grayscale-[0.2]' : ''}`}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-inner bg-stone-50"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 shadow-inner" />
            )}

            <div className="flex min-w-0 flex-1 flex-col py-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold leading-tight text-stone-900 line-clamp-2">{item.name}</h3>
                  {isUnavailable && <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">Unavailable</span>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.foodItemId)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="shrink-0 p-1 text-stone-400 transition hover:text-rose-500"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>

              <span className="mt-1 text-xs font-semibold text-stone-500">{formatCurrency(item.price)}</span>

              <div className="mt-auto flex items-end justify-between pt-3">
                <div className={`flex h-8 items-center justify-between overflow-hidden rounded-lg border shadow-sm w-24 ${isUnavailable ? 'border-stone-200 bg-stone-50' : 'border-amber-200 bg-white ring-1 ring-amber-500/10'}`}>
                  <button
                    type="button"
                    onClick={() => dec(item.foodItemId)}
                    disabled={isUnavailable}
                    aria-label={`Decrease ${item.name}`}
                    className={`flex h-full w-1/3 items-center justify-center text-lg font-bold transition ${isUnavailable ? 'text-stone-400 cursor-not-allowed' : 'text-amber-600 hover:bg-amber-50 active:bg-amber-100'}`}
                  >
                    −
                  </button>
                  <span className={`w-1/3 text-center text-sm font-bold ${isUnavailable ? 'text-stone-400' : 'text-amber-700'}`}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => inc(item.foodItemId)}
                    disabled={isUnavailable}
                    aria-label={`Increase ${item.name}`}
                    className={`flex h-full w-1/3 items-center justify-center text-lg font-bold transition ${isUnavailable ? 'text-stone-400 cursor-not-allowed' : 'text-amber-600 hover:bg-amber-50 active:bg-amber-100'}`}
                  >
                    +
                  </button>
                </div>
                <span className={`text-base font-black ${isUnavailable ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Order summary */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 relative overflow-hidden mb-4">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stone-400">Bill Details</h3>
        
        <div className="flex justify-between text-sm font-medium text-stone-600">
          <span>Item Total</span>
          <span className="text-stone-900">{formatCurrency(subtotal)}</span>
        </div>
        
        <div className="mt-2.5 flex justify-between text-sm font-medium text-stone-600">
          <span>Delivery Partner Fee</span>
          <span className="text-stone-900">{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}</span>
        </div>
      </div>

      {!isOpen && (
        <p className="mt-4 mb-6 flex items-center justify-center gap-2 text-center text-xs font-medium text-stone-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Your cart is saved. Checkout will reopen soon.
        </p>
      )}

      {/* Sticky Checkout Bar */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-2 border-t border-stone-100 bg-white/95 px-4 py-4 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex items-center justify-between text-stone-900">
          <span className="text-sm font-bold text-stone-500">Total To Pay</span>
          <span className="text-lg font-black">{formatCurrency(total)}</span>
        </div>
        
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          disabled={!isOpen || hasUnavailableItems}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:from-stone-300 disabled:to-stone-300 disabled:shadow-none"
        >
          {!isOpen ? (
            'Cafe is Closed'
          ) : hasUnavailableItems ? (
            'Remove unavailable items'
          ) : (
            <>
              Proceed to Checkout
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
