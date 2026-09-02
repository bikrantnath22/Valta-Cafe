// scripts/seed.js — populate the database with sample menu data + settings.
//
// Idempotent: re-running updates existing records (matched by name) rather than
// creating duplicates. Run with:  npm run seed   (from the server/ folder)
//
// Requires MONGO_URI in server/.env.
import 'dotenv/config';
import mongoose from 'mongoose';

import SiteSettings from '../models/SiteSettings.js';
import Category from '../models/Category.js';
import FoodItem from '../models/FoodItem.js';
import User from '../models/User.js';

import bcrypt from 'bcrypt';

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const CATEGORIES = [
  { name: 'Coffee & Tea', description: 'Freshly brewed', order: 1 },
  { name: 'Burgers', description: 'Stacked and juicy', order: 2 },
  { name: 'Pizza', description: 'Wood-fired', order: 3 },
  { name: 'Sides', description: 'Perfect companions', order: 4 },
  { name: 'Desserts', description: 'Sweet endings', order: 5 },
  { name: 'Cold Drinks', description: 'Chilled refreshers', order: 6 },
];

// category = category name; images = array of unsplash photo ids
const ITEMS = [
  { name: 'Espresso', category: 'Coffee & Tea', price: 120, isVeg: true, images: ['photo-1510591509098-f4fdc6d0ff04'] },
  { name: 'Cappuccino', category: 'Coffee & Tea', price: 160, isVeg: true, images: ['photo-1572442388796-11668a67e53d', 'photo-1534778101976-62847782c213'] },
  { name: 'Masala Chai', category: 'Coffee & Tea', price: 80, isVeg: true, images: ['photo-1571934811356-5cc061b6821f'] },
  { name: 'Classic Veg Burger', category: 'Burgers', price: 180, isVeg: true, images: ['photo-1520072959219-c595dc870360'] },
  { name: 'Chicken Burger', category: 'Burgers', price: 220, isVeg: false, images: ['photo-1568901346375-23c9450c58cd', 'photo-1550547660-d9450f859349'] },
  { name: 'Margherita Pizza', category: 'Pizza', price: 320, isVeg: true, images: ['photo-1513104890138-7c749659a591'] },
  { name: 'Pepperoni Pizza', category: 'Pizza', price: 420, isVeg: false, isAvailable: false, images: ['photo-1534308983496-4fabb1a015ee'] },
  { name: 'French Fries', category: 'Sides', price: 120, isVeg: true, images: ['photo-1573080496219-bb080dd4f877'] },
  { name: 'Garden Salad', category: 'Sides', price: 150, isVeg: true, images: ['photo-1512621776951-a57141f2eefd'] },
  { name: 'Chocolate Brownie', category: 'Desserts', price: 140, isVeg: true, images: ['photo-1606313564200-e75d5e30476c'] },
  { name: 'Cheesecake', category: 'Desserts', price: 180, isVeg: true, images: ['photo-1578985545062-69928b1d9587'] },
  { name: 'Cold Coffee', category: 'Cold Drinks', price: 160, isVeg: true, images: ['photo-1461023058943-07fcbe16d735'] },
  { name: 'Iced Lemon Tea', category: 'Cold Drinks', price: 120, isVeg: true, images: ['photo-1499638673689-79a0b5115d87'] },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set. Add it to server/.env before seeding.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);

  // 1) Settings (singleton) — set sensible defaults for testing.
  const settings = await SiteSettings.getSettings();
  settings.cafeName = settings.cafeName || 'VALTA Cafe';
  settings.openingHours = { start: '09:00', end: '22:00' };
  settings.isManuallyClosed = false;
  settings.deliveryFee = 30;
  await settings.save();
  console.log('✅ Site settings ready (open 09:00–22:00, delivery fee ₹30).');

  // 2) Owner for the seeded food items (createdBy is required).
  const adminEmail = 'admin@email.com';
  const adminPassword = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  let owner = await User.findOne({ email: adminEmail });
  if (!owner) {
    owner = await User.create({
      name: 'Admin',
      email: adminEmail,
      role: 'admin',
      isActive: true,
      passwordHash,
    });
    console.log(`ℹ️  Created admin user ${adminEmail} (password: ${adminPassword}).`);
  } else {
    owner.passwordHash = passwordHash;
    owner.role = 'admin';
    await owner.save();
    console.log(`ℹ️  Updated existing admin user "${owner.email}" with new password.`);
  }

  // 3) Categories (upsert by name).
  const categoryIdByName = {};
  for (const c of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { name: c.name },
      { $set: { description: c.description, order: c.order } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    categoryIdByName[c.name] = doc._id;
  }
  console.log(`✅ ${CATEGORIES.length} categories upserted.`);

  // 4) Food items (upsert by name).
  let count = 0;
  for (const item of ITEMS) {
    const images = item.images.map((id) => ({ url: IMG(id), public_id: `seed/${slug(item.name)}-${id.slice(-6)}` }));
    await FoodItem.findOneAndUpdate(
      { name: item.name },
      {
        $set: {
          price: item.price,
          isVeg: Boolean(item.isVeg),
          isAvailable: item.isAvailable !== false,
          categoryId: categoryIdByName[item.category],
          images,
        },
        $setOnInsert: { createdBy: owner._id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    count += 1;
  }
  console.log(`✅ ${count} food items upserted (1 marked unavailable for testing).`);

  await mongoose.disconnect();
  console.log('🌱 Seed complete.');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
