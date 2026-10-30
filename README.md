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

### Step 1: Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project or create a new one.
3. In the sidebar, navigate to **APIs & Services** > **OAuth consent screen**:
   - User Type: **External**
   - App Name: `CaterCrew`
   - User Support Email: your email
   - Developer Contact Email: your email
   - Save and proceed with standard scopes (`.../auth/userinfo.email`, `.../auth/userinfo.profile`).
4. In the sidebar, go to **Credentials**:
   - Click **+ Create Credentials** > **OAuth Client ID**.
   - Application Type: **Web application**.
   - Name: `CaterCrew Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://localhost:3000`
     - `https://silver.catercrew.online`
   - **Authorized redirect URIs**:
     - `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
       *(You will copy this from your Supabase Dashboard in Step 2)*.
   - Click **Create** and copy your **Client ID** and **Client Secret**.

### Step 2: Supabase Authentication Providers
1. Open your [Supabase Dashboard](https://supabase.com/dashboard) > **Authentication** > **Providers**.
2. Select **Google**:
   - Toggle **Enable Sign in with Google** to ON.
   - Paste the **Client ID** and **Client Secret** obtained from Google Cloud Console.
   - Copy the **Callback URL (for OAuth)** shown in the modal (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`) and ensure it matches the authorized redirect URI in Google Cloud Console.
3. Under **Authentication** > **URL Configuration**:
   - Set **Site URL**: `https://silver.catercrew.online`
   - Add **Redirect URLs**:
     - `https://silver.catercrew.online/auth/callback`
     - `http://localhost:5173/auth/callback`
     - `http://localhost:3000/auth/callback`
4. Click **Save**.

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
