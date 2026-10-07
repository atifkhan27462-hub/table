# 🍽️ Atif & Abdullah Foods — Complete Setup, Database & Free Hosting Guide
> **100% Free Lifetime Hosting (Render + Neon.tech + Vercel)** — No Credit Card Required!

---

## 📑 Table of Contents
1. [Architecture & Services Breakdown](#1-architecture--services-breakdown)
2. [Complete Database Structure (All 23 Tables)](#2-complete-database-structure-all-23-tables)
3. [Step 1: 1-Click Neon Database Setup & Table Generator](#3-step-1-1-click-neon-database-setup--table-generator)
4. [Step 2: Push Code to GitHub](#4-step-2-push-code-to-github)
5. [Step 3: Deploy FastAPI Backend on Render.com](#5-step-3-deploy-fastapi-backend-on-rendercom)
6. [Step 4: Deploy Next.js Frontends on Vercel.com](#6-step-4-deploy-nextjs-frontends-on-vercelcom)
7. [Step 5: Default Credentials & Verification](#7-step-5-default-credentials--verification)
8. [Pro-Tip: Keep Render Free Tier Active 24/7](#8-pro-tip-keep-render-free-tier-active-247)
9. [Alternative Method: Run Locally with Cloudflare Tunnels](#9-alternative-method-run-locally-with-cloudflare-tunnels)

---

## 1. Architecture & Services Breakdown

| Component | Technology | Free Cloud Host | Free Tier Benefits | Credit Card Required? |
| :--- | :--- | :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 16 | **[Neon.tech](https://neon.tech)** | 0.5 GB Serverless DB, instant branch | ❌ **No (0 PKR / 0 USD)** |
| **API Backend & WebSockets** | Python 3.12 / FastAPI | **[Render.com](https://render.com)** | 512 MB RAM Free Web Service | ❌ **No (0 PKR / 0 USD)** |
| **Admin POS & Management** | Next.js 14 / React | **[Vercel.com](https://vercel.com)** | Global Edge CDN, Free SSL | ❌ **No (0 PKR / 0 USD)** |
| **Customer Dining Kiosk** | Next.js 14 / React | **[Vercel.com](https://vercel.com)** | Global Edge CDN, Free SSL | ❌ **No (0 PKR / 0 USD)** |
| **Kitchen Display (KDS)** | Next.js 14 / React | **[Vercel.com](https://vercel.com)** | Global Edge CDN, Free SSL | ❌ **No (0 PKR / 0 USD)** |

---

## 2. Complete Database Structure (All 23 Tables)

When you initialize the database, SQLAlchemy creates the following 23 relational tables in PostgreSQL:

| # | Table Name | Purpose / Data Stored | Key Columns |
| :---: | :--- | :--- | :--- |
| **1** | `restaurants` | Restaurant identity, branch details, tax & service fees | `id`, `name`, `slug`, `currency`, `tax_rate`, `address` |
| **2** | `roles` | RBAC roles (SUPERADMIN, MANAGER, KITCHEN, WAITER, etc.) | `id`, `restaurant_id`, `code`, `name`, `is_system` |
| **3** | `permissions` | Granular security privileges | `id`, `code`, `name`, `resource`, `action` |
| **4** | `role_permissions`| Association link between roles and permissions | `role_id`, `permission_id` |
| **5** | `users` | Staff, manager, and chef user accounts | `id`, `email`, `password_hash`, `role_id`, `full_name` |
| **6** | `customers` | Dining customer profiles and loyalty info | `id`, `restaurant_id`, `phone`, `name`, `loyalty_points` |
| **7** | `tables` | Physical dining tables and occupancy status | `id`, `table_number`, `capacity`, `section`, `status` |
| **8** | `table_devices` | 32-inch table touchscreens / Android tablets paired | `id`, `table_id`, `hardware_id`, `network_status`, `status` |
| **9** | `sessions` | Active customer dining session per table | `id`, `table_id`, `session_token`, `status`, `opened_at` |
| **10** | `categories` | Menu categories (Starters, Burgers, Steaks, Drinks, etc.) | `id`, `name`, `slug`, `icon`, `sort_order`, `is_active` |
| **11** | `products` | Dishes and items with prices, prep times, allergens | `id`, `category_id`, `kitchen_station_id`, `name`, `price` |
| **12** | `product_options`| Modifiers (Doneness, Drink size, Side dishes) | `id`, `product_id`, `name`, `type`, `is_required` |
| **13** | `product_option_values` | Choices for modifiers with extra pricing | `id`, `option_id`, `name`, `price_modifier` |
| **14** | `orders` | Customer POS & online food orders | `id`, `session_id`, `table_id`, `status`, `total_amount` |
| **15** | `order_items` | Individual items inside an order with custom notes | `id`, `order_id`, `product_id`, `quantity`, `unit_price` |
| **16** | `order_item_options` | Selected options for an ordered item | `id`, `order_item_id`, `option_value_id` |
| **17** | `payments` | Cash, Card, and digital payment transactions | `id`, `order_id`, `payment_method`, `amount`, `status` |
| **18** | `kitchen_stations` | Stations in the kitchen (Grill, Saute, Cold, Bar) | `id`, `code`, `name`, `display_order`, `is_active` |
| **19** | `kitchen_orders` | Real-time tickets routed to kitchen display screens | `id`, `order_item_id`, `station_id`, `status` |
| **20** | `ai_generations` | AI chef dish suggestions, pairing recommendations | `id`, `restaurant_id`, `generation_type`, `latency_ms` |
| **21** | `games` | Interactive touch games (Trivia, Spin & Win, Match) | `id`, `title`, `slug`, `promotion_code`, `promotion_discount_percent` |
| **22** | `audit_logs` | Security and administrative action trail | `id`, `user_id`, `action`, `resource_type`, `timestamp` |
| **23** | `notifications` | Staff alerts (Call Waiter, Request Bill, Water Refill) | `id`, `restaurant_id`, `type`, `message`, `status` |

---

## 3. Step 1: 1-Click Neon Database Setup & Table Generator

Humne aapke project folder mein ek automatic script bana di hai jo **1-click mein saare 23 tables Neon cloud database mein bana degi aur initial data load kar degi**:

1. [Neon Console](https://console.neon.tech) par jayein aur **"Connect"** button daba kar apni Connection String copy karein:
   ```text
   postgresql://neondb_owner:password@ep-calm-breeze-53798272.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
2. Apne project folder (`e:\table website`) mein jayein aur **`setup_neon_db.bat`** par double click karein.
3. Window mein apni Neon connection string paste karein aur **Enter** dabayein.
4. **Result:**
   - Script Neon se connect hogi.
   - Saare **23 Tables** create karegi.
   - High-performance indexes apply karegi.
   - **Atif & Abdullah Foods** ka master data, 10 clean tables (sab AVAILABLE status par), admin user (`admin@smarttable.io`), chef user (`chef@smarttable.io`), aur initial menu categories & dishes load kar degi!
   - Connection string ko automatically `backend/.env` mein bhi save kar degi.

---

## 4. Step 2: Push Code to GitHub

Hosting services (Render aur Vercel) direct aapke GitHub se code deploy karti hain:

1. [github.com](https://github.com) par jayein aur nayi repository banayein: `smart-restaurant-app`.
2. Apne computer ke project folder mein PowerShell open karke yeh commands chalayein:

```powershell
git init
git add .
git commit -m "Complete Smart Restaurant System Ready For Deployment"
git branch -M main
git remote add origin https://github.com/APNA_GITHUB_USERNAME/smart-restaurant-app.git
git push -u origin main
```

*(Note: `APNA_GITHUB_USERNAME` ki jagah apna real GitHub username likhein).*

---

## 5. Step 3: Deploy FastAPI Backend on Render.com

1. [Render.com](https://render.com) par jayein aur **"Sign in with GitHub"** karein.
2. Top bar par **"New +"** button daba kar **"Web Service"** choose karein.
3. Apni GitHub repository `smart-restaurant-app` select karein.
4. Niche diye gaye parameters fill karein:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `restaurant-backend-api` | Aapka backend subdomain banega |
| **Region** | `US East (Ohio)` ya `Singapore` | Neon database ke qareeb wala region |
| **Branch** | `main` | Production branch |
| **Root Directory** | `backend` | ⚠️ **Bohat zaroori!** Isko lazmi `backend` likhein |
| **Runtime** | `Python 3` | Python runtime |
| **Build Command** | `pip install -r requirements.txt` | Saari Python packages install karega |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Production server launch command |
| **Instance Type** | **Free ($0/month)** | 100% Free |

5. **Environment Variables Add Karein:**
   Usi form mein neeche **"Add Environment Variable"** par click karein aur yeh 3 variables set karein:
   - `DATABASE_URL` = `postgresql://neondb_owner:password@ep-calm-breeze-53798272.us-east-2.aws.neon.tech/neondb?sslmode=require` *(Neon wali connection string)*
   - `ENVIRONMENT` = `production`
   - `SECRET_KEY` = `restaurant_jwt_secure_super_secret_key_32chars_long!`
6. **"Create Web Service"** par click karein!
7. 2 minute ke andar aapka backend live ho jayega aur Render aapko live URL de dega:
   `https://restaurant-backend-api.onrender.com`
   - Test kijiye: `https://restaurant-backend-api.onrender.com/api/v1/health` par `{"status":"healthy"}` aana chahiye.

---

## 6. Step 4: Deploy Next.js Frontends on Vercel.com

Next.js frontends ko Vercel par deploy karna bohot aasan hai. Hum 3 projects create karenge taake teeno apps alag alag URLs par accessible hon:

1. [Vercel.com](https://vercel.com) par jayein aur **"Continue with GitHub"** karein.

---

### App 1: Admin POS & Dashboard (`apps/admin-dashboard`)
1. Vercel dashboard par **"Add New..."** ➔ **"Project"** par click karein.
2. Apni GitHub repo `smart-restaurant-app` ke aage **"Import"** dabayein.
3. **Configure Project:**
   - **Project Name:** `restaurant-admin-dashboard`
   - **Root Directory:** Edit par click karein aur `apps/admin-dashboard` select karein.
   - **Framework Preset:** Next.js
4. **Environment Variables:**
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://restaurant-backend-api.onrender.com/api/v1` *(STEP 3 wala backend URL jiske aage `/api/v1` ho)*
5. **"Deploy"** par click karein!
   - Result: `https://restaurant-admin-dashboard.vercel.app`

---

### App 2: Customer Dining Kiosk (`apps/customer-app`)
1. Vercel par dobara **"Add New..."** ➔ **"Project"** karein.
2. Wahi repo dobara **"Import"** karein.
3. **Configure Project:**
   - **Project Name:** `restaurant-customer-app`
   - **Root Directory:** `apps/customer-app`
4. **Environment Variables:**
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://restaurant-backend-api.onrender.com/api/v1`
5. **"Deploy"** par click karein!
   - Result: `https://restaurant-customer-app.vercel.app/?table=1`

---

### App 3: Kitchen Display System (`apps/kds-app`)
1. Vercel par dobara **"Add New..."** ➔ **"Project"** karein.
2. Wahi repo dobara **"Import"** karein.
3. **Configure Project:**
   - **Project Name:** `restaurant-kitchen-kds`
   - **Root Directory:** `apps/kds-app`
4. **Environment Variables:**
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://restaurant-backend-api.onrender.com/api/v1`
5. **"Deploy"** par click karein!
   - Result: `https://restaurant-kitchen-kds.vercel.app`

---

## 7. Step 5: Default Credentials & Verification

Aapke system mein pehle se configured master logins yeh hain:

| Role | Email Login | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `admin@smarttable.io` | `admin12345` | Complete POS, Table Reset, Data Clear, Analytics, Menu, Add Table |
| **Executive Chef** | `chef@smarttable.io` | `chef12345` | Real-time Kitchen Orders, Station Prep, Order Bump |

---

## 8. Pro-Tip: Keep Render Free Tier Active 24/7

Render ka free tier 15 minutes tak koi user na aane par sleep mode mein chala jata hai aur pehli request aane par uthne mein ~30 second leta hai.

Isko **24/7 hamesha active aur tez rakhne ka free solution**:
1. [cron-job.org](https://cron-job.org) par bilkul free account banayein.
2. **"Create Cronjob"** par click karein.
3. **Title:** `Restaurant Backend Keep Alive`
4. **URL:** `https://restaurant-backend-api.onrender.com/api/v1/health`
5. **Schedule:** Every 10 Minutes.
6. **Save** kar dein.
Ab Render ka backend kabhi sleep nahi hoga aur 24 ghante instant speed par response dega!

---

## 9. Alternative Method: Run Locally with Cloudflare Tunnels

Agar aap kisi cloud par deploy karne ke bajaye apne restaurant ke counter laptop / PC ko hi server banana chahte hain aur internet par mobiles aur tablets connect karna chahte hain:

1. Apne folder mein **`start_with_tunnels.bat`** par double click karein.
2. Ye aapke local computer par database aur servers start kar ke secure live links (`*.trycloudflare.com`) create kar dega.
3. Ye method bhi **100% Free** hai aur isme kisi internet hosting platform par account banane ki zaroorat nahi hoti.

---

### 🎉 All Done!
Aapka pura restaurant software ab 100% cloud par bina kisi kharche ke live chalne ke liye tayyar hai!
