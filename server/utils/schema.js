// utils/schema.js — Zod schemas for input validation
import { z } from 'zod';

// Matches exactly 10 digits
const phoneRegex = /^[0-9]{10}$/;

export const addressSchema = z.object({
  label: z.string().trim().optional(),
  address: z.string().trim().min(4, 'Please enter a complete delivery address (at least 4 characters).'),
  phone: z.string().trim().regex(phoneRegex, 'Phone must be exactly 10 digits'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export const orderItemSchema = z.object({
  foodItemId: z.string().trim().min(1, 'Item ID required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  fulfillmentMethod: z.enum(['pickup', 'delivery']),
  paymentMethod: z.enum(['cod', 'online']).optional(),
  pickupTime: z.string().optional(),
  addressId: z.string().optional(),
  address: z.any().optional(),
  notes: z.string().max(500).optional(),
});

export const roleUpdateSchema = z.object({
  role: z.enum(['customer', 'admin', 'superadmin'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
});
