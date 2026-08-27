// src/store/cartStore.js — client-side cart (Zustand + localStorage persistence).
//
// Items are keyed by foodItemId. We store a light snapshot of each item (name,
// price, image, isVeg) so the cart renders without re-fetching the menu; the
// server always recomputes authoritative prices/totals when an order is placed.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCart = create(
  persist(
    (set, get) => ({
      items: [], // [{ foodItemId, name, price, image, isVeg, quantity }]

      /** Add one unit of an item (increments if already in the cart). */
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.foodItemId === item.foodItemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.foodItemId === item.foodItemId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      remove: (foodItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.foodItemId !== foodItemId) })),

      /** Set an explicit quantity; removes the line when qty ≤ 0. */
      setQty: (foodItemId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.foodItemId !== foodItemId)
              : state.items.map((i) => (i.foodItemId === foodItemId ? { ...i, quantity: qty } : i)),
        })),

      inc: (foodItemId) => {
        const cur = get().items.find((i) => i.foodItemId === foodItemId)?.quantity || 0;
        get().setQty(foodItemId, cur + 1);
      },

      dec: (foodItemId) => {
        const cur = get().items.find((i) => i.foodItemId === foodItemId)?.quantity || 0;
        get().setQty(foodItemId, cur - 1);
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'valta-cart' } // localStorage key
  )
);

// Derived selectors (use with useCart(selectCount) etc.)
export const selectCount = (state) => state.items.reduce((n, i) => n + i.quantity, 0);
export const selectSubtotal = (state) => state.items.reduce((t, i) => t + i.price * i.quantity, 0);
