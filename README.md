# CaterCrew — Event Catering Staff & Booking Platform

CaterCrew connects event management companies across Kerala with verified catering staff ("Silver Boys"). Staff have tiers: **Silver**, **Golden**, and **Diamond**. The platform handles staff registration, background verification, digital PDF certificate generation, event posting, and instant slot bookings.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router 7
- **Icons**: Lucide React
- **Certificate Generation**: jsPDF (A4 landscape) + QRCode (tamper-proof QR linking to public verification badge)
- **Backend**: Supabase (PostgreSQL 15+, Row Level Security, Storage, Auth, Security-Definer RPCs)
- **Deployment**: Cloudflare Workers (`wrangler.jsonc`) at `silver.catercrew.online`

---

## 📱 Pages & Features

### 1. Catering Boy Workflow
- **Public Registration (`/register`)**:
  - Full details, validated 18+ age requirement, district selection, photo, and government ID proof upload.
- **Verification Status (`/status/:id`)**:
  - Real-time status lookup (Pending, Verified, or Suspended).
  - When verified, boys can download the tamper-proof PDF certificate.
- **Public Verification Badge (`/verify/:id`)**:
  - QR destination from the certificate. Shows only safe public details (Full Name, Photo, Tier, ID, Verified Date).
- **Boy Login & Signup (`/signup` -> "I am a Catering Boy")**:
  - Enters CaterCrew ID (e.g. `CC-SLV-000001`) and registered phone number.
  - Eligibility checked via security-definer RPC `check_worker_eligibility(code, phone)`.
  - Links login credentials (Email/Password or Google) via RPC `activate_worker(code, phone)`.
- **Events & Booking (`/events`, `/events/:id`, `/my-bookings`)**:
  - Browse verified events across Kerala with district and date filters.
  - Large display of confirmed wage per boy in ₹ (e.g., ₹1,200).
  - Keyless Google Maps venue embed with one-tap directions, Open in Maps, and WhatsApp share.
  - Instant slot booking via RPC `book_slot(p_event_id)` and cancellation via RPC `cancel_booking(p_booking_id)` (blocked <24h before event).
  - Reveals event coordinator's name and direct Call & WhatsApp buttons once booked.

### 2. Event Company Workflow
- **Company Signup (`/signup` -> "I am an Event Company")**:
  - Google Sign-in or Email + Password.
- **Company Setup (`/company/setup`)**:
  - Numbered form cards:
    1. Company details (name, type, years in business)
    2. Contact (name, phone, WhatsApp with "Same as phone" checkbox, email)
    3. Location (Kerala district dropdown, area, full address)
    4. Verification (GST number, business proof upload to private `company-docs` bucket)
    5. Consent
  - Accounts start with `pending` status until reviewed by CaterCrew operations.
- **Company Dashboard (`/company/dashboard`)**:
  - Overview of posted events, active slots, and boys hired.
- **Post & Edit Events (`/company/events/new`, `/company/events/:id/edit`)**:
  - Event details, timing with auto-calculated duration, venue, Google Maps link validation, and geolocation coordinates.
  - Number of boys needed and wage per boy in ₹.
  - Uniform multi-select chips (Black shirt, White shirt, Black trousers, Shoes, Clean shave).
- **Manage Event & Booked Boys (`/company/events/:id`)**:
  - Live progress bar of booked slots.
  - Real-time roster of confirmed boys with photo, age, height, district, experience, and phone.
  - Direct Call and WhatsApp buttons for event coordinators.
  - Remove boy feature with automatic slot reopening.
  - Printable staff attendance sheet for venue gates.

### 3. Administrator Dashboard (`/adminaccess`)
- Supabase Email & Password authentication; authorized against the `admins` table.
- **Staff Registrations Tab**: Review, verify, change tiers, or suspend catering boys.
- **Companies Tab**: Review pending event companies, inspect uploaded business proofs via short-lived signed URLs, approve or suspend accounts.
- **Events Tab**: Oversee all catering events across Kerala, monitor slot fulfillment, cancel or delete events.
- **Report Page**: Attendance and shortage monitoring for active events.

---

## 🗄️ Supabase Database Migration Guide

The database schema and RPCs are divided into two safe SQL scripts:

1. **Initial Schema**: [`supabase/schema.sql`](supabase/schema.sql)
   - Creates `workers`, `admins`, triggers for worker IDs (`CC-SLV-000001`), RLS policies, `photos`, and `id-proofs` buckets.

2. **Events & Company Subsystem Migration**: [`supabase/migration_events_v2.sql`](supabase/migration_events_v2.sql)
   - Creates `companies`, `events`, and `bookings` tables with safe constraints and indexes.
   - Creates the `events_public` view (masks coordinator phone until booked).
   - Creates private storage bucket `company-docs` with RLS policies.
   - Installs RPC functions:
     - `check_worker_eligibility(p_worker_code, p_phone)`
     - `activate_worker(p_worker_code, p_phone)`
     - `get_user_role()`
     - `book_slot(p_event_id)`
     - `cancel_booking(p_booking_id, p_reason)`
     - `get_event_company_contact(p_event_id)`
     - `get_event_booked_workers(p_event_id)`
     - `company_remove_worker(p_booking_id, p_reason)`

### Applying the Migration:
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New Query**, paste the contents of `supabase/migration_events_v2.sql`, and click **Run**.
4. The migration is idempotent and safe to run on existing databases (`if not exists`, `drop policy if exists`).

---

## 🔐 Google Cloud OAuth & Supabase Setup Checklist

To enable "Continue with Google" authentication for both Catering Boys and Event Companies:

### Your Configured Client ID:
`995897892983-kea6h6q4m64ghu4lv1pl17rma80mhuhu.apps.googleusercontent.com`

---

### Step 1: In Google Cloud Console
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your OAuth 2.0 Web Client (`995897892983-kea6h6q4m64ghu4lv1pl17rma80mhuhu...`).
3. Under **Authorized JavaScript origins**, make sure you have:
   - `https://silver.catercrew.online`
   - `https://ais-dev-ayhp4cpjb5v5646t4tfdg4-987152010618.asia-southeast1.run.app`
   - `http://localhost:3000`
4. Under **Authorized redirect URIs**, add your Supabase Auth callback:
   - `https://euamrlqdpkzpnrhftjro.supabase.co/auth/v1/callback`
5. Click **Save** and copy your **Client Secret**.

---

### Step 2: In Supabase Authentication Providers
1. Open your [Supabase Google Provider Dashboard](https://supabase.com/dashboard/project/euamrlqdpkzpnrhftjro/auth/providers).
2. Click on **Google**:
   - Toggle **Enable Sign in with Google** to **ON**.
   - Paste **Client ID**:
     `995897892983-kea6h6q4m64ghu4lv1pl17rma80mhuhu.apps.googleusercontent.com`
   - Paste your **Client Secret** from Google Cloud Console.
   - Click **Save**.
3. Under **Authentication** > **URL Configuration**:
   - Ensure **Site URL** is set to `https://silver.catercrew.online`
   - Add **Redirect URLs**:
     - `https://silver.catercrew.online/auth/callback`
     - `https://ais-dev-ayhp4cpjb5v5646t4tfdg4-987152010618.asia-southeast1.run.app/auth/callback`
     - `http://localhost:3000/auth/callback`
4. Click **Save**.

---

### ⚠️ Instant Alternative While Configuring
You do not need to wait for Google OAuth setup to test or use CaterCrew:
- Users and event companies can register and log in right now using **Email & Password**.

---

## 👨‍💼 Approving Your First Company & Testing

1. **Sign up as a Company**:
   - Navigate to `/signup` and select **"I am an Event Company"**.
   - Sign up with email or Google.
   - Fill in `/company/setup` with company details and upload visiting card/license.
2. **Approve via Admin Panel**:
   - Navigate to `/adminaccess`.
   - Log in with your admin credentials.
   - Click the **"Companies"** tab.
   - Click **Review** on the newly registered company, review proof document, and click **Approve Company**.
3. **Post an Event**:
   - The company can now go to `/company/dashboard` and click **"Post New Event"** (`/company/events/new`).
   - Enter event title, date, reporting time, venue with map link, number of boys, and wage (₹).
4. **Book as a Catering Boy**:
   - A registered Silver Boy can log in at `/login` or sign up at `/signup` with his CaterCrew ID.
   - Open `/events`, view the event details, and click **"Confirm & Book My Slot"**.
   - The company will immediately see his profile and phone number under `/company/events/:id`.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Production build
npm run build
```
