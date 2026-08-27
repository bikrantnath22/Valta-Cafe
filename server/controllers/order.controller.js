// controllers/order.controller.js — customer order placement and history.
import mongoose from 'mongoose';
import Order, { ORDER_STATUSES, PAYMENT_STATUSES } from '../models/Order.js';
import Notification from '../models/Notification.js';
import FoodItem from '../models/FoodItem.js';
import SiteSettings from '../models/SiteSettings.js';
import { getIO } from '../socket.js';
import { sendPushNotification } from '../services/push.service.js';
import { logAudit } from '../utils/audit.js';
import { computeIsOpen } from '../utils/cafe.js';
import { isValidPhone, toFiniteNumber } from '../utils/validation.js';

const STAFF_ROLES = ['admin', 'superadmin'];

/** Build the snapshotted delivery address from either a saved id or an inline object. */
function resolveDeliveryAddress(user, addressId, inline, fulfillmentMethod) {
  if (fulfillmentMethod === 'pickup') {
    if (!inline || !inline.phone) {
      return { error: 'A phone number is required for pickup orders.' };
    }
    if (!isValidPhone(inline.phone)) {
      return { error: 'Please enter a valid phone number.' };
    }
    return {
      value: {
        phone: String(inline.phone).trim(),
      },
    };
  }

  if (addressId) {
    const saved = user.savedAddresses.id(addressId);
    if (!saved) return { error: 'Selected delivery address was not found.' };
    return {
      value: {
        address: saved.address,
        phone: saved.phone,
        lat: saved.lat,
        lng: saved.lng,
      },
    };
  }

  if (inline && (inline.address || inline.phone)) {
    if (!inline.address || !String(inline.address).trim()) {
      return { error: 'A delivery address is required.' };
    }
    if (!isValidPhone(inline.phone)) {
      return { error: 'A valid phone number is required for delivery.' };
    }
    return {
      value: {
        address: String(inline.address).trim(),
        phone: String(inline.phone).trim(),
        lat: toFiniteNumber(inline.lat),
        lng: toFiniteNumber(inline.lng),
      },
    };
  }

  return { error: 'A delivery address is required.' };
}

/**
 * POST /api/orders (auth)
 * Places a Cash-on-Delivery order. Rejects when the cafe is closed. Prices and
 * the total are computed on the server from the current menu — client-supplied
 * prices are never trusted.
 */
export async function createOrder(req, res, next) {
  try {
    const settings = await SiteSettings.getSettings();
    if (!computeIsOpen(settings)) {
      return res.status(409).json({
        status: 'error',
        code: 'CAFE_CLOSED',
        message: settings.closedMessage || 'The cafe is currently closed.',
      });
    }

    const { items, addressId, address, fulfillmentMethod, pickupTime, notes } = req.body || {};
    
    const method = fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
    if (method === 'pickup') {
      if (!pickupTime) {
        return res.status(400).json({ status: 'error', message: 'Please select a pickup time.' });
      }
      
      if (pickupTime !== 'immediate') {
        const [ph, pm] = pickupTime.split(':').map(Number);
        const [startH, startM] = (settings.openingHours?.start || '09:00').split(':').map(Number);
        const [endH, endM] = (settings.openingHours?.end || '21:00').split(':').map(Number);
        
        const pickupMins = ph * 60 + pm;
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        
        let isValidTime = true;
        if (startMins <= endMins) {
          isValidTime = pickupMins >= startMins && pickupMins <= endMins;
        } else {
          isValidTime = pickupMins >= startMins || pickupMins <= endMins;
        }
        
        if (!isValidTime) {
          return res.status(400).json({ 
            status: 'error', 
            message: `Pickup time must be between ${settings.openingHours?.start || '09:00'} and ${settings.openingHours?.end || '21:00'}.` 
          });
        }
        
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        
        // If it's an overnight shift, and we are currently before midnight but pickup is after midnight
        let isPast = false;
        if (startMins > endMins && nowMins >= startMins && pickupMins <= endMins) {
          // pickup is tomorrow, so it's definitely in the future
          isPast = false;
        } else if (startMins > endMins && nowMins <= endMins && pickupMins >= startMins) {
          // now is e.g. 2 AM, but pickup is 10 PM. That would be 10 PM yesterday!
          isPast = true; 
        } else {
          // same day comparison
          isPast = pickupMins < nowMins - 15;
        }
        
        if (isPast) { 
          return res.status(400).json({ status: 'error', message: 'Pickup time cannot be in the past.' });
        }
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Your cart is empty.' });
    }

    // Validate ids up front.
    for (const line of items) {
      if (!line || !mongoose.isValidObjectId(line.foodItemId)) {
        return res.status(400).json({ status: 'error', message: 'Cart contains an invalid item.' });
      }
    }

    const ids = items.map((i) => i.foodItemId);
    const foodDocs = await FoodItem.find({ _id: { $in: ids } });
    const byId = new Map(foodDocs.map((d) => [String(d._id), d]));

    const orderItems = [];
    for (const line of items) {
      const doc = byId.get(String(line.foodItemId));
      const qty = Number(line.quantity);

      if (!doc) {
        return res.status(400).json({ status: 'error', message: 'An item in your cart is no longer on the menu.' });
      }
      if (!doc.isAvailable) {
        return res.status(409).json({ status: 'error', message: `"${doc.name}" is currently unavailable.` });
      }
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ status: 'error', message: `Invalid quantity for "${doc.name}".` });
      }

      orderItems.push({ foodItemId: doc._id, name: doc.name, price: doc.price, quantity: qty });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = method === 'pickup' ? 0 : (settings.deliveryFee || 0);
    const totalAmount = subtotal + deliveryFee;

    const resolved = resolveDeliveryAddress(req.user, addressId, address, method);
    if (resolved.error) {
      return res.status(400).json({ status: 'error', message: resolved.error });
    }

    const order = await Order.create({
      customerId: req.user._id,
      items: orderItems,
      totalAmount,
      deliveryFee,
      fulfillmentMethod: method,
      pickupTime: method === 'pickup' ? pickupTime : undefined,
      deliveryAddress: resolved.value,
      notes: typeof notes === 'string' ? notes.slice(0, 300) : undefined,
      paymentMethod: 'cod',
    });

    try {
      const itemSummary = orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const notif = await Notification.create({
        recipientRole: 'admin',
        orderId: order._id,
        message: `New order from ${req.user.name || 'a customer'} - ${itemSummary}`,
      });
      const io = getIO();
      io.to('admins').emit('new_order', {
        notification: notif,
        order: {
          _id: order._id,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          itemsCount: order.items.length,
          customerName: req.user.name || 'a customer'
        }
      });
      sendPushNotification(
        { role: { $in: ['admin', 'superadmin'] } },
        {
          title: `New Order #${order.orderId}`,
          body: `${order.items.length} items for ₹${order.totalAmount}`,
          url: `/admin/orders?highlight=${order._id}`
        }
      ).catch(console.error);
    } catch (socketErr) {
      console.error('Socket emit error (createOrder):', socketErr);
    }

    res.status(201).json({ status: 'ok', order, subtotal, deliveryFee });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders (auth) — the current user's orders, newest first. */
export async function listOrders(req, res, next) {
  try {
    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ status: 'ok', orders });
  } catch (err) {
    next(err);
  }
}

/** GET /api/orders/:id (auth) — a single order (owner or staff only). */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const isOwner = String(order.customerId) === String(req.user._id);
    if (!isOwner && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'You cannot view this order.' });
    }

    res.json({ status: 'ok', order });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/admin/all (staff)
 * Every order, newest first, with the customer's name/email/phone populated so
 * the dashboard can show who placed each order. Filtering/search is done on the
 * client from this list.
 */
export async function listAllOrders(req, res, next) {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email phone')
      .lean();
    res.json({ status: 'ok', orders });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/orders/:id/status (staff)
 * Updates an order's `status` (appending to statusHistory) and/or its COD
 * `paymentStatus`. At least one of the two must be supplied.
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    const { status, paymentStatus } = req.body || {};

    if (status === undefined && paymentStatus === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Provide a new status or paymentStatus.',
      });
    }
    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid order status.' });
    }
    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ status: 'error', message: 'Invalid payment status.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    // Only append to history when the status actually changes.
    if (status !== undefined && status !== order.status) {
      order.status = status;
      order.statusHistory.push({ status, timestamp: new Date() });

      // Build items preview
      const itemsCount = order.items.length;
      const firstFewItems = order.items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ');
      const itemsPreview = itemsCount > 2 ? `${firstFewItems}, and ${itemsCount - 2} more` : firstFewItems;

      try {
        const message = `Your order with ${itemsPreview} is now ${status}.`;
        const notification = await Notification.create({
          recipientRole: 'customer',
          customerId: order.customerId,
          type: 'order_status',
          message,
          orderId: order._id,
        });

        const io = getIO();
        io.to(String(order.customerId)).emit('order_status_updated', {
          _id: order._id,
          orderId: order.orderId,
          status: order.status,
          fulfillmentMethod: order.fulfillmentMethod,
          itemsPreview,
          notification
        });
        sendPushNotification(
          { userId: order.customerId },
          {
            title: 'Order Status Updated',
            body: message,
            url: `/orders/${order._id}`
          }
        ).catch(console.error);
      } catch (socketErr) {
        console.error('Socket emit error (updateOrderStatus):', socketErr);
      }
    }
    if (paymentStatus !== undefined) {
      if (order.paymentStatus !== paymentStatus) {
        order.paymentStatus = paymentStatus;
        try {
          const io = getIO();
          io.to('admins').emit('order_payment_updated', {
            _id: order._id,
            orderId: order.orderId,
            paymentStatus: order.paymentStatus
          });
          io.to(String(order.customerId)).emit('order_payment_updated', {
            _id: order._id,
            orderId: order.orderId,
            paymentStatus: order.paymentStatus
          });
        } catch (socketErr) {
          console.error('Socket emit error (order_payment_updated):', socketErr);
        }
      }
    }

    await order.save();
    res.json({ status: 'ok', order });
  } catch (err) {
    next(err);
  }
}
