# Booking Mini App — Hotel Booking & Price Comparison

A full-stack hotel booking and price comparison platform built with **Next.js 16** (App Router), **MongoDB/Mongoose**, **Kinde Auth**, and **Tailwind CSS**.

## Features

### Booking System
- **Search listings** by location and price range
- **Detailed listing view** with booking form
- **Server-side validation** (ObjectId, date ranges, guest count, price ranges)
- **Booking conflict detection** — prevents double-booking same dates
- **Availability window check** — respects each listing's `availableFrom` / `availableTo`
- **Live pricing** — nights × rate calculated client and server side
- **Authentication** via Kinde (Sign in / Sign up / Sign out)

### Hotel Price Comparison Engine (`/compare`)
Real-time price comparison powered by [Xotelo API](https://xotelo.com/) — **free, no auth required**.
- Compares prices across **Booking.com**, **Expedia**, **Hotels.com**, **Agoda**, **Vio**, **Amari**, and more
- **Cheapest highlighted** with provider badge
- **Savings %** calculated vs the most expensive provider
- **City filter** with curated catalog of 12+ popular hotels in 8 cities
- **Real TripAdvisor hotel keys** (format `g{geo}-d{hotel}`)

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | MongoDB + Mongoose |
| Auth | Kinde (`@kinde-oss/kinde-auth-nextjs`) |
| Styling | Tailwind CSS v4 |
| Price API | Xotelo (free, no auth) |
| Language | TypeScript + JavaScript |

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── auth/[...kindeAuth]/  # Kinde auth handler
│   │   ├── bookings/             # POST/GET bookings
│   │   ├── compare/              # Price comparison engine
│   │   ├── health/               # Health check
│   │   └── listings/             # GET listings + GET by id
│   ├── book/[id]/                # Booking form page
│   ├── compare/                  # Price comparison UI
│   ├── dashboard/                # User dashboard (auth required)
│   ├── search/                   # Search results
│   └── page.tsx                  # Home page
├── components/
│   ├── ListingCard.tsx
│   └── SearchBar.tsx
├── lib/
│   ├── db.js                     # Mongoose connection
│   ├── hotels-catalog.js         # Curated hotel keys for Xotelo
│   ├── models/                   # Listing, Booking schemas
│   ├── seed.js                   # Sample listings seed
│   ├── validation.js             # Reusable validators
│   └── xotelo.js                 # Xotelo API client
├── middleware.ts                 # Kinde auth middleware
└── .env.local                    # Environment variables
```

## API Reference

### `GET /api/listings?location=&minPrice=&maxPrice=`
List apartments with filters. Validates that prices are non-negative numbers and `minPrice <= maxPrice`.

### `GET /api/listings/:id`
Returns one listing. Validates `id` is a valid Mongo ObjectId.

### `POST /api/bookings`
Creates a booking. Validates:
- All required fields present
- `listingId` is a valid ObjectId
- `guestName` ≥ 2 chars (trimmed)
- `guests` is a positive integer
- `checkIn` < `checkOut`
- Listing exists and dates fall within `availableFrom`/`availableTo`
- **No overlap with existing confirmed bookings**

### `GET /api/compare`
Three modes:
- No params → returns full catalog: `{ cities, hotels }`
- `?city=Paris` → returns hotels in that city
- `?hotelKey=g187147-d188728&checkIn=2026-06-01&checkOut=2026-06-05` → real-time price comparison from multiple OTAs with savings calculation

### `GET /api/health`
Returns `{ status, db, timestamp }` — useful for monitoring.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (`.env.local`)
```env
# Kinde auth — get free credentials at https://kinde.com/
KINDE_CLIENT_ID=...
KINDE_CLIENT_SECRET=...
KINDE_ISSUER_URL=https://your-subdomain.kinde.com
KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/dashboard

# MongoDB (optional — only needed for booking flow, not price comparison)
MONGODB_URI=mongodb://127.0.0.1:27017/booking_clone
```

### 3. Seed sample listings (optional)
```bash
node lib/seed.js
```

### 4. Run dev server
```bash
npm run dev
```

Open <http://localhost:3000>.

## Pages

| Route | Description | Auth |
|-------|-------------|------|
| `/` | Home with search bar + feature cards | Public |
| `/search?location=...` | Search results | Public |
| `/book/:id` | Booking form for a specific listing | Public |
| `/compare` | Hotel price comparison across OTAs | Public |
| `/dashboard` | User dashboard | Required |
| `/profile` | User profile | Required |

## Live Comparison Example

```bash
curl "http://localhost:3000/api/compare?hotelKey=g297930-d305178&checkIn=2026-06-01&checkOut=2026-06-05"
```

Returns real prices like:
```json
{
  "cheapest": { "provider": "Vio.com", "total": 136, "currency": "USD" },
  "savingsPct": 9,
  "savingsAmount": 13,
  "rates": [
    { "provider": "Vio.com", "total": 136 },
    { "provider": "Amari.com", "total": 148 },
    { "provider": "Agoda.com", "total": 148 },
    { "provider": "Booking.com", "total": 149 }
  ]
}
```

## License

MIT
