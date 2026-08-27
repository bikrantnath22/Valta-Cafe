// src/pages/customer/CheckoutPage.jsx — choose a delivery address, confirm
// Cash on Delivery, and place the order. Blocked entirely when the cafe is
// closed. On success we clear the cart and hand off to the order detail page,
// which doubles as the confirmation screen.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAddresses, addAddress, updateAddress, createOrder } from '../../lib/api.js';
import { useCart, selectSubtotal } from '../../store/cartStore.js';
import { useSettings } from '../../store/settingsStore.js';
import { formatCurrency, isValidPhone } from '../../lib/validation.js';
import AddressForm from '../../components/customer/AddressForm.jsx';

export default function CheckoutPage() {
  const navigate = useNavigate();

  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart(selectSubtotal);

  const isOpen = useSettings((s) => s.isOpen);
  const settings = useSettings((s) => s.settings);
  const [fulfillmentMethod, setFulfillmentMethod] = useState('delivery');
  
  const deliveryFee = fulfillmentMethod === 'pickup' ? 0 : (settings?.deliveryFee || 0);
  const total = subtotal + deliveryFee;

  const [addresses, setAddresses] = useState([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isSelectingAddress, setIsSelectingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  
  const [pickupPhone, setPickupPhone] = useState('');
  const [pickupTimeType, setPickupTimeType] = useState('immediate');
  const [pickupDate, setPickupDate] = useState(null);
  
  const [notes, setNotes] = useState('');
  const [isAddingNotes, setIsAddingNotes] = useState(true);

  // Generate available 15-minute time slots for scheduling
  const availableSlots = useMemo(() => {
    if (!settings?.openingHours) return [];
    
    const [startH, startM] = (settings.openingHours.start || '09:00').split(':').map(Number);
    const [endH, endM] = (settings.openingHours.end || '21:00').split(':').map(Number);
    
    const nowTime = new Date();
    
    // Determine the logical business day start and end
    const openTime = new Date(nowTime);
    openTime.setHours(startH, startM, 0, 0);
    
    const closeTime = new Date(nowTime);
    closeTime.setHours(endH, endM, 0, 0);
    
    // If closing time is numerically before opening time (e.g. 02:00 < 09:00), it crosses midnight.
    if (endH < startH) {
      if (nowTime.getHours() < endH) {
        // It's e.g. 1 AM. We are in the "tail" of yesterday's business day.
        openTime.setDate(openTime.getDate() - 1);
      } else {
        // It's e.g. 10 AM. We are in the "start" of today's business day.
        closeTime.setDate(closeTime.getDate() + 1);
      }
    }
    
    // The earliest we can schedule is max(now + 30mins prep time, openTime).
    const prepBufferMs = 30 * 60000;
    const earliestPossible = new Date(nowTime.getTime() + prepBufferMs);
    let currentSlot = new Date(Math.max(earliestPossible.getTime(), openTime.getTime()));
    
    const m = currentSlot.getMinutes();
    const remainder = m % 15;
    if (remainder > 0) {
      currentSlot.setMinutes(m + (15 - remainder));
    }
    currentSlot.setSeconds(0, 0);
    currentSlot.setMilliseconds(0);
    
    const slots = [];
    while (currentSlot <= closeTime) {
      slots.push(new Date(currentSlot));
      currentSlot = new Date(currentSlot.getTime() + 15 * 60000);
    }
    
    return slots;
  }, [settings?.openingHours]);

  // Group slots by time of day, preserving chronological rendering order
  const groupedSlots = useMemo(() => {
    const groupsMap = new Map();

    availableSlots.forEach((slot) => {
      const h = slot.getHours();
      let label = '';
      if (h >= 5 && h < 12) label = 'Morning';
      else if (h >= 12 && h < 17) label = 'Afternoon';
      else if (h >= 17 && h < 21) label = 'Evening';
      else label = 'Late Night';

      if (!groupsMap.has(label)) {
        groupsMap.set(label, { label, slots: [] });
      }
      groupsMap.get(label).slots.push(slot);
    });

    return Array.from(groupsMap.values());
  }, [availableSlots]);

  const [savingAddr, setSavingAddr] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  // Load saved addresses; preselect the default (or first).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listAddresses();
        if (!active) return;
        const list = data.addresses || [];
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) || list[0];
        if (preferred) {
          setSelectedId(preferred._id);
          setPickupPhone(preferred.phone); // pre-fill pickup phone if they have one
        } else {
          setShowNewForm(true);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoadingAddr(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const orderLines = useMemo(
    () => items.map((i) => ({ foodItemId: i.foodItemId, quantity: i.quantity })),
    [items]
  );

  // Save a new address at checkout, then select it.
  const handleSaveNewAddress = async (payload) => {
    setSavingAddr(true);
    setError(null);
    try {
      const beforeIds = new Set(addresses.map((a) => a._id));
      const data = await addAddress(payload);
      const list = data.addresses || [];
      setAddresses(list);
      const created = list.find((a) => !beforeIds.has(a._id)) || list[list.length - 1];
      if (created) setSelectedId(created._id);
      setEditingAddressId(null);
      setIsSelectingAddress(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAddr(false);
    }
  };

  const handleEditAddress = async (id, payload) => {
    setSavingAddr(true);
    setError(null);
    try {
      const data = await updateAddress(id, payload);
      setAddresses(data.addresses || []);
      setEditingAddressId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAddr(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (fulfillmentMethod === 'delivery' && !selectedId) {
      setError('Please choose a delivery address.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (fulfillmentMethod === 'pickup') {
      if (!pickupPhone || !isValidPhone(pickupPhone)) {
        setError('Please enter a valid 10-digit phone number for pickup.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (pickupTimeType === 'scheduled') {
        if (!pickupDate) {
          setError('Please select a pickup time.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (pickupDate < new Date(Date.now() - 5 * 60000)) {
          setError('Selected time is in the past.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    setPlacing(true);
    setError(null);
    try {
      const payload = { items: orderLines, fulfillmentMethod, notes: notes.trim() };
      if (fulfillmentMethod === 'delivery') {
        payload.addressId = selectedId;
      } else {
        if (pickupTimeType === 'immediate') {
          payload.pickupTime = 'immediate';
        } else {
          const h = String(pickupDate.getHours()).padStart(2, '0');
          const m = String(pickupDate.getMinutes()).padStart(2, '0');
          payload.pickupTime = `${h}:${m}`;
        }
        payload.address = { phone: pickupPhone };
      }
      const data = await createOrder(payload);
      if (data.status === 'error') {
        setError(data.message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setPlacing(false);
        return;
      }
      clearCart();
      navigate(`/orders/${data.order._id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setPlacing(false);
    }
  };

  // Empty cart guard.
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-semibold text-stone-800">Your cart is empty</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-stone-900">Checkout</h1>

      {/* Closed notice — blocks placing the order. */}
      {!isOpen && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">The cafe is currently closed</p>
          <p className="mt-1">
            {settings?.closedMessage || 'Please try again during our opening hours.'}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Fulfillment Toggle */}
      <div className="mb-6 flex rounded-2xl bg-stone-100 p-1 shadow-inner">
        <button
          type="button"
          onClick={() => setFulfillmentMethod('delivery')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
            fulfillmentMethod === 'delivery'
              ? 'bg-white text-amber-700 shadow-md ring-1 ring-black/5'
              : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          Delivery
        </button>
        <button
          type="button"
          onClick={() => setFulfillmentMethod('pickup')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
            fulfillmentMethod === 'pickup'
              ? 'bg-white text-amber-700 shadow-md ring-1 ring-black/5'
              : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Store Pickup
        </button>
      </div>

      {/* Fulfillment Details */}
      <section className="mb-4">
        <h2 className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500">
          <span>{fulfillmentMethod === 'delivery' ? 'Delivery address' : 'Pickup details'}</span>
          {fulfillmentMethod === 'delivery' && (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold tracking-normal text-green-700 ring-1 ring-green-200 shadow-sm normal-case animate-in fade-in zoom-in duration-300">
              ⚡ {settings?.estimatedDeliveryTime || '40-45 min'}
            </span>
          )}
        </h2>

        {fulfillmentMethod === 'delivery' ? (
          loadingAddr ? (
            <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
          ) : (
          <div className="space-y-2">
            {!isSelectingAddress && selectedId ? (
              editingAddressId === selectedId ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <AddressForm
                    initial={addresses.find((a) => a._id === selectedId)}
                    busy={savingAddr}
                    onSubmit={(payload) => handleEditAddress(selectedId, payload)}
                    onCancel={() => setEditingAddressId(null)}
                  />
                </div>
              ) : (
                // Selected Address Summary
                <div className="rounded-xl border border-amber-400 bg-amber-50/60 ring-1 ring-amber-300 p-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    {(() => {
                      const addr = addresses.find(a => a._id === selectedId);
                      if (!addr) return null;
                      return (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {addr.label && <span className="text-sm font-semibold text-stone-900">{addr.label}</span>}
                            {addr.isDefault && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Default</span>}
                          </div>
                          <p className="mt-0.5 whitespace-pre-line text-sm text-stone-600">{addr.address}</p>
                          <p className="mt-0.5 text-xs text-stone-500">{addr.phone}</p>
                        </div>
                      );
                    })()}
                    <div className="flex shrink-0 flex-col gap-2">
                      <button 
                        type="button"
                        onClick={() => setIsSelectingAddress(true)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              // Address Selection List
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Select an address</span>
                  {selectedId && (
                    <button 
                      type="button"
                      onClick={() => setIsSelectingAddress(false)}
                      className="text-xs font-medium text-stone-500 hover:text-stone-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {addresses.map((addr) => {
                  if (editingAddressId === addr._id) {
                    return (
                      <div key={addr._id} className="mt-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AddressForm
                          initial={addr}
                          busy={savingAddr}
                          onSubmit={(payload) => handleEditAddress(addr._id, payload)}
                          onCancel={() => setEditingAddressId(null)}
                        />
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={addr._id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition ${
                        selectedId === addr._id
                          ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <label className="flex flex-1 cursor-pointer items-start gap-3 min-w-0">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedId === addr._id}
                          onChange={() => {
                            setSelectedId(addr._id);
                            setIsSelectingAddress(false);
                            setEditingAddressId(null);
                          }}
                          className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {addr.label && (
                              <span className="text-sm font-semibold text-stone-900">{addr.label}</span>
                            )}
                            {addr.isDefault && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-line text-sm text-stone-600">{addr.address}</p>
                          <p className="text-xs text-stone-500">{addr.phone}</p>
                        </div>
                      </label>
                      <button 
                        type="button"
                        onClick={() => setEditingAddressId(addr._id)}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}

                {editingAddressId === 'new' ? (
                  <div className="mt-4">
                    <AddressForm
                      busy={savingAddr}
                      onSubmit={handleSaveNewAddress}
                      onCancel={addresses.length ? () => setEditingAddressId(null) : undefined}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingAddressId('new')}
                    className="w-full mt-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    + Use a new address
                  </button>
                )}
              </div>
            )}
          </div>
          )
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {/* Header banner: Cafe Location */}
            <div className="flex items-start gap-3 border-b border-stone-100 bg-stone-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div className="flex-1">
                <label className="mb-0.5 block text-sm font-bold text-stone-900">
                  Pickup Location
                </label>
                <p className="whitespace-pre-line text-sm text-stone-600">
                  {settings?.contactInfo?.address || 'Cafe Address not set'}
                </p>
                {settings?.contactInfo?.phone && (
                  <p className="mt-1 text-xs text-stone-500 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {settings.contactInfo.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Contact */}
            <div className="flex items-start gap-3 border-b border-amber-100 bg-amber-50/50 p-3 pb-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-bold text-stone-900">
                  Contact Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <input
                    type="tel"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm font-medium text-stone-900 placeholder:font-normal focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Time selection */}
            <div className="p-3">
              <label className="mb-2 block text-[13px] font-bold text-stone-900">Pickup Time</label>
              <div className="flex gap-2">
                <label className="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-stone-100 bg-stone-50 py-2.5 transition-all hover:bg-stone-100 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50">
                  <input
                    type="radio"
                    name="pickupTimeType"
                    className="peer sr-only"
                    checked={pickupTimeType === 'immediate'}
                    onChange={() => setPickupTimeType('immediate')}
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-400 shadow-sm transition-colors group-has-[:checked]:text-amber-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-stone-600 group-has-[:checked]:text-amber-700">Immediate</div>
                    <div className="text-[11px] font-bold text-stone-400 group-has-[:checked]:text-green-600 mt-0.5 flex items-center justify-center gap-0.5">
                      <span className="group-has-[:checked]:animate-pulse">⚡</span> {settings?.estimatedPickupTime || '10-15 min'}
                    </div>
                  </div>
                </label>
                <label className="group flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-stone-100 bg-stone-50 py-2.5 transition-all hover:bg-stone-100 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/50">
                  <input
                    type="radio"
                    name="pickupTimeType"
                    className="peer sr-only"
                    checked={pickupTimeType === 'scheduled'}
                    onChange={() => setPickupTimeType('scheduled')}
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-400 shadow-sm transition-colors group-has-[:checked]:text-amber-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <span className="text-xs font-bold text-stone-600 group-has-[:checked]:text-amber-700">Scheduled</span>
                </label>
              </div>

              {pickupTimeType === 'scheduled' && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Select a time
                  </label>
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-4 custom-scrollbar rounded-xl border border-stone-100 bg-stone-50/50 p-3">
                    {groupedSlots.length === 0 ? (
                      <p className="text-xs text-stone-500 text-center py-4">No available times for today.</p>
                    ) : (
                      groupedSlots.map((group) => (
                        <div key={group.label}>
                          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            {group.label}
                          </h3>
                          <div className="grid grid-cols-3 gap-2">
                            {group.slots.map((slot) => {
                              const isSelected = pickupDate?.getTime() === slot.getTime();
                              return (
                                <button
                                  key={slot.toISOString()}
                                  type="button"
                                  onClick={() => setPickupDate(slot)}
                                  className={`rounded-lg border py-2 text-[11px] font-bold transition-all ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-500/20'
                                      : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-stone-50'
                                  }`}
                                >
                                  {slot.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Order Notes */}
      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Cooking Instructions</h2>
        {!isAddingNotes && notes ? (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <span className="text-sm font-medium text-amber-800 italic truncate pr-4">"{notes}"</span>
            <button
              type="button"
              onClick={() => setIsAddingNotes(true)}
              className="shrink-0 text-xs font-bold text-amber-600 hover:text-amber-700"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. less spicy, allergy info..."
              className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
              rows={2}
              maxLength={300}
            />
            <div className="flex justify-end gap-2">
              {notes && (
                <button
                  type="button"
                  onClick={() => {
                    setNotes('');
                    setIsAddingNotes(true);
                  }}
                  className="rounded-lg bg-stone-100 px-4 py-2 text-xs font-bold text-stone-600 shadow-sm transition hover:bg-stone-200"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsAddingNotes(false)}
                className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800"
              >
                {notes ? 'Save' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Payment */}
      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Payment</h2>
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg">
            💵
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-900">Cash on Delivery / UPI</p>
            <p className="text-xs text-stone-500">Pay when your order arrives.</p>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mb-2">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
          Order summary
        </h2>
        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <ul className="space-y-1.5">
            {items.map((i) => (
              <li key={i.foodItemId} className="flex justify-between text-[13px] text-stone-600">
                <span className="min-w-0 truncate">
                  {i.name} <span className="text-stone-400">× {i.quantity}</span>
                </span>
                <span className="ml-2 shrink-0">{formatCurrency(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
            <div className="flex justify-between text-[13px] text-stone-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {fulfillmentMethod === 'delivery' && (
              <div className="flex justify-between text-[13px] text-stone-600">
                <span>Delivery fee</span>
                <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Place Order Bar */}
      <div className="sticky bottom-0 z-30 -mx-4 mt-4 border-t border-stone-100 bg-white/95 px-4 py-4 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex items-center justify-between text-stone-900">
          <span className="text-sm font-bold text-stone-500">Total To Pay</span>
          <span className="text-lg font-black">{formatCurrency(total)}</span>
        </div>
        
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={!isOpen || placing || (fulfillmentMethod === 'delivery' && (loadingAddr || !selectedId))}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 py-3.5 text-base font-bold text-white shadow-lg shadow-green-500/20 transition-all hover:from-green-600 hover:to-green-700 active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:from-stone-300 disabled:to-stone-300 disabled:shadow-none"
        >
          {!isOpen ? (
            'Cafe is closed'
          ) : placing ? (
            'Placing order...'
          ) : (
            <>
              Place Order
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
