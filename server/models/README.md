# Mongoose models

All models use ES modules and default-export the compiled model. Shared enums
are named exports (e.g. `ROLES`, `ORDER_STATUSES`).

| File               | Model         | Notes                                                                                          |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| `User.js`          | User          | Roles `superadmin/admin/customer`. `passwordHash` is `select:false`. `savedAddresses` subdocs (address + phone required). `isActive` deactivates admins. `createdAt` only. |
| `Category.js`      | Category      | Unique `name`, `order` for display sorting (indexed). Timestamps.                              |
| `FoodItem.js`      | FoodItem      | Cloudinary `images` (`url` + `public_id`, ≥1 required). `categoryId` (indexed), `isAvailable`, `isVeg`, `createdBy`. Timestamps (incl. `updatedAt`). |
| `Order.js`         | Order         | Auto `orderId`, snapshotted `items` + `deliveryAddress`, `status`/`paymentStatus` enums, `statusHistory` (seeded on create). Indexes on `status` and `createdAt`. |
| `Notification.js`  | Notification  | `recipientRole`, `orderId` ref, `message`, `isRead`. Compound index for unread-by-role.        |
| `SiteSettings.js`  | SiteSettings  | Enforced singleton (`singletonKey`). Opening hours (HH:mm), `isManuallyClosed`, `closedMessage`, delivery fee/radius, contact info. Use `SiteSettings.getSettings()`. |

## Conventions

- One model per file, PascalCase filename, `export default mongoose.model(...)`.
- Snapshot denormalized data on orders (item name/price, delivery address) so
  historical orders remain accurate after the menu or profile changes.
- Cloudinary assets store both `url` and `public_id` so images can be deleted later.
