# CaterCrew (Silver Staff Registration & Verification)

CaterCrew connects event management companies across Kerala with verified catering staff ("boys"). Staff have tiers: **Silver**, **Golden**, and **Diamond**. This initial version focuses on **Silver Boy** registration, verification, digital PDF certificate generation, and administration.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router 7
- **Icons**: Lucide React
- **Certificate Generation**: jsPDF (A4 landscape) + QRCode (tamper-proof QR linking to public verification badge)
- **Backend**: Supabase (PostgreSQL, Row Level Security, Storage, Auth, Security-Definer RPCs)
- **Design Philosophy**: Mobile-first, minimal design, pure white background, warm amber/gold accent, large readable text, big touch-friendly buttons.

---

## 📱 Pages & Features

1. **Home (`/`)**:
   - CaterCrew branding and one-line description.
   - Prominent **"Register as Silver Boy"** action button.
   - **"Verify a certificate"** search card with direct worker ID lookup.
2. **Registration Form (`/register`)**:
   - Public registration (no login required).
   - Form fields:
     - Full Name, Date of Birth (validated 18+ requirement), Height (cm), Weight (kg, optional)
     - Phone, WhatsApp number (with "Same as phone" option)
     - District (dropdown of all 14 Kerala districts), Town / Area, Willingness to travel across districts
     - Photo upload (required, image only, max 3 MB)
     - Government ID proof upload (Aadhaar or College ID, PDF or image, max 5 MB)
     - Experience in years, Roles selection (Serving, Kitchen help, Setup, Cleaning), Uniform check (white shirt & black pants)
     - Emergency contact person and phone
     - Mandatory consent checkbox
   - **Submission Success Screen**:
     - Displays unique Worker ID (e.g., `CC-SLV-000123`).
     - Message stating registration is pending review.
     - Direct link & button to his personal status page.
3. **Status Page (`/status/:id`)**:
   - Real-time status lookup (Pending, Verified, or Suspended).
   - When **Verified**:
     - **"Download certificate (PDF)"**: Generates an elegant A4 landscape PDF certificate in the browser with worker photo, unique ID, tier, issue date, and verification QR code.
     - **"Copy verification link"**: Copies public verification link to clipboard.
     - **"View Public Verification Badge Page"**: Opens the public verification view.
4. **Public Verification Page (`/verify/:id`)**:
   - The target destination of the certificate's QR code.
   - Shows a large green **VERIFIED** badge (or Pending / Suspended / Not found).
   - **Privacy Protection**: Displays **only** safe public details: Full Name, Photo, Staff Tier, Worker ID, and Verified Date. Never exposes phone number, address, date of birth, or ID proof.
5. **Admin Dashboard (`/admin`)**:
   - Supabase Email & Password authentication.
   - Validates that the logged-in user is listed in the `admins` table.
   - Overview metrics: Total, Pending, Verified, and Suspended counts.
   - Filter tabs (All / Pending / Verified / Suspended) and instant search by Name, Phone, ID, or District.
   - Detailed modal view with secure **signed URLs** for reviewing private ID proof documents (images or PDFs).
   - Management actions:
     - **Verify Staff Member** (marks status as verified, records `verified_at` timestamp)
     - **Suspend**
     - **Change Tier** (Silver, Golden, Diamond)
     - **Reject / Delete** with confirmation safeguard
   - **Export to CSV**: Downloads complete registration records for offline dispatching or accounting.

---

## 🗄️ Supabase Setup Guide

The complete SQL schema, trigger functions, RLS policies, and storage setup are located in [`supabase/schema.sql`](file:///home/adithyan/Documents/Catercrew/Catercrew-Silverboys-1-/supabase/schema.sql).

### Step 1: Run the Database Schema

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. Go to the **SQL Editor** in the left sidebar.
3. Click **New Query**, copy the entire contents of [`supabase/schema.sql`](file:///home/adithyan/Documents/Catercrew/Catercrew-Silverboys-1-/supabase/schema.sql), paste it into the editor, and click **Run**.
4. This script sets up:
   - `workers` table with constraints and indexes.
   - Sequence and `generate_worker_code` trigger for generating codes formatted as `CC-SLV-000001`.
   - `admins` table.
   - Row Level Security (RLS) policies on `workers` and `admins`.
   - Security-definer RPC functions: `get_public_worker(code)` and `register_worker(...)`.
   - Storage buckets: `photos` (public read) and `id-proofs` (private, admin signed URL only).

---

### Step 2: Create the First Admin User

1. In the Supabase Dashboard, navigate to **Authentication** -> **Users**.
2. Click **Add User** -> **Create User**.
3. Enter an email (e.g., `admin@catercrew.in`) and a secure password.
4. Copy the generated **User UID** (a UUID string such as `e94e24ef-9886-4f6b-a2c6-993d6d5a1b32`).
5. Open the **SQL Editor** and run the following statement (substituting your copied UID):
   ```sql
   insert into public.admins (user_id)
   values ('YOUR_COPIED_USER_UID')
   on conflict do nothing;
   ```
6. You can now log in at `/admin` using this email and password!

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Set your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: Both values can be found in your Supabase project under **Project Settings** -> **API**.

---

## 💻 Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

3. **Lint check**:
   ```bash
   npm run lint
   ```

4. **Production build**:
   ```bash
   npm run build
   ```

---

## 🌐 Deployment Instructions

### Option 1: Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
3. Import this repository.
4. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Keep default build settings (`npm run build`, output directory `dist`).
6. Click **Deploy**.

> **SPA Routing on Vercel**: A `vercel.json` rewrite file ensures client-side routes (e.g. `/register`, `/verify/:id`) load seamlessly without 404s.

---

### Option 2: Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. Set the build configuration:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Save and Deploy**.
7. For single-page app routing on Cloudflare Pages, a `public/_redirects` file with `/*  /index.html  200` is included.

---

## 🔒 Security & Privacy Notes

- **Restricted Public RPC**: The verification page and status lookup do not select from the `workers` table directly; they execute `get_public_worker`, which returns only public display fields (`full_name`, `photo_path`, `tier`, `status`, `worker_code`, `verified_at`).
- **Private ID Proofs**: The `id-proofs` bucket has RLS enabled with no public read access. Files can only be downloaded by authenticated admins via short-lived signed URLs.
- **Client Fallback**: If Supabase credentials have not been configured yet, the app activates a safe demo mode with sample records and helpful configuration banners.
