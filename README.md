# VALTA Cafe — Online Food Ordering

A full-stack online food ordering site for **VALTA Cafe**, built as a separate
React frontend and Node.js/Express backend (plain JavaScript).

This repo currently contains the **foundation, data models, authentication, and
the full customer-facing app**: a runnable server exposing public menu/settings
endpoints and authenticated address/order endpoints, the full set of Mongoose
models, Google sign-in with role-based access, Cloudinary image hosting, and a
mobile-first React app where customers browse the menu, build a cart, save
delivery addresses, place Cash-on-Delivery orders, and track order status.
The admin dashboard and real-time (Socket.io) order updates are added in later
passes.

**Cafe open/closed is decided by the server.** `GET /api/settings` returns a
computed `isOpen` boolean (based on the configured opening hours in the cafe's
timezone, or a manual override), so the customer app never depends on the
device clock. When closed, a banner shows the cafe's `closedMessage` app-wide
and all ordering actions are disabled — customers can still browse the menu.

## Tech stack

| Layer    | Choice                                             |
| -------- | -------------------------------------------------- |
| Frontend | React + Vite, Tailwind CSS, react-router-dom       |
| Client state | Zustand (cart + cafe settings; cart persisted to localStorage) |
| Backend  | Node.js + Express (ES modules)                     |
| Database | MongoDB via Mongoose                               |
| Images   | Cloudinary (upload via multer memory storage)      |
| Dev CORS | Vite `localhost:5173` → API `localhost:5000`       |

## Project structure

```
ValTA-Resturant/
├── server/                 # Express API
│   ├── server.js           # Entry point (loads env, connects DB, starts server)
│   ├── app.js              # Express app: middleware, CORS, cookies, passport, routes
│   ├── config/
│   │   ├── db.js           # Mongoose connection
│   │   ├── passport.js     # Google OAuth 2.0 strategy
│   │   └── cloudinary.js   # Cloudinary SDK config (image hosting)
│   ├── routes/             # health, auth, upload, settings, menu, address, order + index.js
│   ├── controllers/        # health, auth, upload, settings, menu, address, order
│   ├── middleware/         # notFound, errorHandler, auth (requireAuth/requireRole), upload (multer)
│   ├── utils/              # jwt.js, cloudinary.js, cafe.js (isOpen calc), validation.js (phone)
│   ├── scripts/            # seed.js (sample settings, categories & menu items)
│   └── models/             # User, Category, FoodItem, Order, Notification, SiteSettings
│
└── client/                 # React (Vite) app — mobile-first customer UI
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx        # App bootstrap + BrowserRouter + AuthProvider
        ├── App.jsx         # Routes (customer app shell + login)
        ├── lib/            # api.js (fetch helper), validation.js, orderStatus.js
        ├── store/          # cartStore.js, settingsStore.js (Zustand)
        ├── context/AuthContext.jsx   # current-user state via /api/auth/me
        ├── pages/customer/ # MenuPage, CartPage, CheckoutPage, OrdersPage,
        │                   #   OrderDetailPage, AddressesPage, Login
        └── components/
            ├── shared/     # ImageUploader.jsx (admin multi-image upload widget)
            └── customer/   # CustomerLayout, ClosedBanner, RequireAuth, ImageCarousel,
                            #   FoodItemCard, AddressForm, AddressCard, OrderStatusStepper
```

## Roles

- **Superadmin** — everything an admin can do, plus create/deactivate admin accounts. The developer/owner account.
- **Admin** — orders, item availability, menu & categories, site settings, analytics.
- **Customer** — browse menu, Google sign-in, saved delivery address, place COD orders, track status.

**Auth (implemented):** *Everyone* signs in with **Google** — there's no separate
staff login. The first sign-in auto-creates a `customer` account. Elevated access is
granted by **changing a user's `role` in the database** to `admin` or `superadmin`
(a superadmin will manage this from the admin UI in a later pass). Signing in again
with Google never downgrades an existing role. Sessions are stateless: the server
signs a JWT and stores it in an httpOnly cookie (`valta_token`); the client reads the
current user from `GET /api/auth/me`. Authorization always reads the user's *current*
role from the DB (via `requireAuth`), so a role change takes effect on the next
request — no re-login needed. Route protection uses `requireAuth` and
`requireRole([...])` middleware.

## Prerequisites

- Node.js 18+ (20+ recommended)
- MongoDB running locally, or a MongoDB Atlas connection string
  (the API still starts without a DB — the health check will report `database: disconnected`)

## Getting started

### 1) Backend

```bash
cd server
npm install
cp .env.example .env      # then edit values as needed
npm run dev               # http://localhost:5000
```

Verify the health check:

```bash
curl http://localhost:5000/api/health
# { "status": "ok", "service": "VALTA Cafe API", ... }
```

#### Google OAuth credentials

All login uses Google OAuth 2.0. In the
[Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services →
Credentials**, create an **OAuth client ID** of type *Web application* and set:

- **Authorized redirect URI:** `http://localhost:5000/api/auth/google/callback`
  (must match `GOOGLE_CALLBACK_URL` exactly)

Copy the generated **Client ID** and **Client secret** into `server/.env`
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

#### Making the first superadmin

Everyone signs in with Google and starts as a `customer`. To create the first
elevated account:

1. Sign in once with Google — this creates your `User` document (role `customer`).
2. In MongoDB, find that user (by `email`) and set its `role` field to the string
   `"superadmin"` (allowed values: `superadmin`, `admin`, `customer`).
3. Refresh the app. Authorization reads your role from the DB on each request, so the
   change takes effect immediately — no need to sign in again.

From then on, a superadmin can promote other users to `admin`/`superadmin` (admin UI
comes in a later pass; until then, edit the `role` field directly).

#### Cloudinary credentials (food-item images)

Food-item images are hosted on [Cloudinary](https://cloudinary.com/). Create a free
account, then from the **dashboard** copy your **Cloud name**, **API Key**, and
**API Secret** into `server/.env`:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

(Alternatively set a single `CLOUDINARY_URL=cloudinary://key:secret@cloud-name` and
leave the three above unset.) If Cloudinary isn't configured, the API still starts,
but the upload/delete endpoints return **503** until credentials are provided.
Uploads are stored under the `valta-cafe/food-items/` folder, capped at
**4 images per item, 3 MB each**, and served with automatic format/quality
optimization.

### 2) Frontend

```bash
cd client
npm install               # installs React, react-router-dom, and zustand
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm run dev               # http://localhost:5173
```

Open http://localhost:5173 — the app opens on the **menu**. Browsing and the
cart work without signing in; checkout, order history, and saved addresses
require Google sign-in. For real content, run the seed script (below) or add
items through the API.

### 3) Seed sample data (optional)

To populate the cafe settings, a few categories, and a sample menu (with
Cloudinary-hosted demo images, including one intentionally *unavailable* item):

```bash
cd server
npm run seed              # requires MONGO_URI to be set in server/.env
```

The script is idempotent — re-running it updates the same records rather than
creating duplicates. It attaches new menu items to an existing `admin`/
`superadmin` user if one exists, otherwise it creates a placeholder owner.

## Environment variables

**server/.env**

| Variable               | Default                                   | Purpose                                   |
| ---------------------- | ----------------------------------------- | ----------------------------------------- |
| `PORT`                 | `5000`                                    | API port                                  |
| `NODE_ENV`             | `development`                             | Environment (`production` → secure cookie)|
| `CAFE_TIMEZONE`        | `Asia/Kolkata`                            | IANA timezone used to compute `isOpen` from opening hours |
| `CLIENT_URL`           | `http://localhost:5173`                   | Allowed CORS origin(s), comma-separated   |
| `MONGO_URI`            | `mongodb://127.0.0.1:27017/valta_cafe`    | MongoDB connection string                 |
| `GOOGLE_CLIENT_ID`     | —                                         | Google OAuth client ID                    |
| `GOOGLE_CLIENT_SECRET` | —                                         | Google OAuth client secret                |
| `GOOGLE_CALLBACK_URL`  | `http://localhost:5000/api/auth/google/callback` | OAuth redirect URI (must match Google)|
| `JWT_SECRET`           | —                                         | Secret used to sign JWTs (**required**)   |
| `JWT_EXPIRES_IN`       | `7d`                                      | JWT / cookie lifetime                     |
| `CLOUDINARY_CLOUD_NAME`| —                                         | Cloudinary cloud name (image hosting)     |
| `CLOUDINARY_API_KEY`   | —                                         | Cloudinary API key                        |
| `CLOUDINARY_API_SECRET`| —                                         | Cloudinary API secret                     |
| `CLOUDINARY_URL`       | —                                         | Optional single-string alternative to the three above |

**client/.env**

| Variable       | Default                   | Purpose          |
| -------------- | ------------------------- | ---------------- |
| `VITE_API_URL` | `http://localhost:5000`   | Base URL of API  |

## API

| Method | Path                        | Auth        | Description                                        |
| ------ | --------------------------- | ----------- | -------------------------------------------------- |
| GET    | `/api/health`               | —           | Health check (service + DB connection status)      |
| GET    | `/api/auth/google`          | —           | Start Google OAuth login                           |
| GET    | `/api/auth/google/callback` | —           | OAuth callback; sets cookie, redirects to client   |
| POST   | `/api/auth/logout`          | —           | Clear the auth cookie                              |
| GET    | `/api/auth/me`              | cookie/JWT  | Current authenticated user                         |
| POST   | `/api/upload`               | admin/superadmin | Upload 1–4 images (field `images`) → `[{ url, public_id }]` |
| DELETE | `/api/upload/:publicId`     | admin/superadmin | Delete a Cloudinary asset (URL-encode the `public_id`) |
| GET    | `/api/settings`             | —           | Public cafe settings + computed `isOpen` boolean   |
| GET    | `/api/menu`                 | —           | Categories + food items (includes unavailable items, flagged) |
| GET    | `/api/addresses`            | cookie/JWT  | List the current user's saved addresses            |
| POST   | `/api/addresses`            | cookie/JWT  | Add a saved address (`address` + `phone` required) |
| PATCH  | `/api/addresses/:id`        | cookie/JWT  | Update an address / set it as default              |
| DELETE | `/api/addresses/:id`        | cookie/JWT  | Delete a saved address                             |
| POST   | `/api/orders`               | cookie/JWT  | Place a COD order (server prices items; **409** when closed) |
| GET    | `/api/orders`               | cookie/JWT  | The current user's orders, newest first            |
| GET    | `/api/orders/:id`           | cookie/JWT  | A single order (owner or staff only)               |

### Customer app routes (client)

| Path                  | Auth | Screen                                             |
| --------------------- | ---- | -------------------------------------------------- |
| `/`                   | —    | Menu — browse by category, add to cart             |
| `/cart`               | —    | Cart — adjust quantities, see the running total    |
| `/checkout`           | ✓    | Pick/add an address, confirm COD, place the order  |
| `/orders`             | ✓    | Order history                                      |
| `/orders/:id`         | ✓    | Order tracker (doubles as the confirmation screen) |
| `/account/addresses`  | ✓    | Manage saved delivery addresses                    |
| `/login`              | —    | Google sign-in                                     |

Order status progresses **pending → accepted → preparing → out for delivery →
delivered** (or **cancelled**). The tracker currently polls for updates and is
structured to switch to Socket.io pushes in a later pass.
