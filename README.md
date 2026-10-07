# SMART INTERACTIVE DINING TABLE

> **A Commercial-Grade Restaurant Technology Platform**  
> **Creators:** Abdullah Niazi & Muhammad Atif  
> **Hardware Target:** 32-Inch Interactive Touchscreen Table (1100mm × 700mm × 750mm, 8mm Tempered Glass)

---

## 1. Repository Structure & Monorepo Overview

This repository uses a modular monorepo architecture separating specialized frontend applications, shared domain packages, a deterministic backend, and deployment infrastructure.

```text
smart-dining-table/
├── apps/
│   ├── admin-dashboard/     # Restaurant Admin Console (Next.js 16 + Tailwind CSS) [Port 3000]
│   ├── customer-app/        # 32" Touchscreen Dining Table UI (Next.js 16) [Port 3001]
│   └── kds-app/             # Kitchen Display System for Line Chefs (Next.js 16) [Port 3002]
├── packages/
│   ├── ui/                  # Reusable Atomic Design System (Buttons, Modals, Tables, Charts)
│   └── types/               # Type-safe domain models & API envelopes (TypeScript Strict Mode)
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route controllers (Health, Diagnostics, Info)
│   │   ├── core/            # Config (Pydantic v2), Database, Redis, Errors, Structured Logging
│   │   ├── models/          # SQLAlchemy ORM models (Phase 3)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── services/        # Business logic & AI isolation layers
│   ├── tests/               # Pytest suite with 100% test coverage on foundation
│   ├── requirements.txt     # Python production dependencies
│   ├── Dockerfile           # Backend containerization
│   └── pyproject.toml       # Python tool configuration (pytest, black, isort)
├── infra/
│   └── docker-compose.yml   # PostgreSQL 16 & Redis 7 development containers
├── docs/
│   └── DEVELOPMENT.md       # Engineering conventions & error handling standards
├── .env.example             # Monorepo environment configuration template
└── README.md
```

---

## 2. Quickstart & Development Setup

### Prerequisites
- **Node.js** (v18+ or v20+ recommended)
- **Python** (v3.11+ or v3.12+)
- **Docker & Docker Compose** (Optional for local PostgreSQL and Redis containers)

### Step 1: Environment Setup
Copy the environment template files:
```bash
# In the repository root
copy .env.example .env

# In the backend directory
cd backend
copy .env.example .env
```

### Step 2: Install Dependencies
```bash
# Install frontend monorepo dependencies
npm install

# Setup backend Python environment
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Step 3: Run the Applications

### Step 3: Run the Complete Demonstration

#### Option A: Quickstart All Services (Recommended)
Open 4 terminal tabs:
```bash
# Terminal 1: Backend Brain & WebSocket Server (Port 8080)
npm run dev:backend

# Terminal 2: Customer 32" Table Screen (Port 3001)
npm run dev:customer

# Terminal 3: Kitchen Display System (Port 3002)
npm run dev:kds

# Terminal 4: Restaurant Admin Dashboard (Port 3000)
npm run dev:admin
```

#### Option B: Full Production Docker Stack
```bash
cd infra
docker compose up -d --build
```

#### Step 4: Seed Fresh Demonstration Data
Reset the database to clean presentation state with products, tables, and seed metrics:
```bash
npm run seed
```

---

## 3. Active Service Ports & Endpoints

| Service | Port | Local URL | Role & Target |
| :--- | :--- | :--- | :--- |
| **Customer Table App** | `3001` | `http://localhost:3001` | 32" Touchscreen dining table interface (Table 08) |
| **Kitchen Display (KDS)**| `3002` | `http://localhost:3002` | Line cook ticket management & bumping (Station: `ALL`) |
| **Admin Dashboard** | `3000` | `http://localhost:3000` | Executive operations console, live orders & analytics |
| **Backend API Brain** | `8080` | `http://localhost:8080` | FastAPI brain, WebSockets, DB engine & AI service |
| **Interactive API Docs**| `8080` | `http://localhost:8080/api/v1/docs` | OpenAPI v3 specification & interactive Swagger |
| **Health Liveness Probe**| `8080` | `http://localhost:8080/health` | Lightweight container liveness check |
| **Readiness Probe** | `8080` | `http://localhost:8080/ready` | Deep database & Redis connectivity health check |

---

## 4. Professional Demonstration Mode (17-Stage Flow)

The platform is designed for an end-to-end live demonstration proving that **TABLE ↕ BACKEND ↕ DATABASE ↕ KDS ↕ ADMIN ↕ AI** are genuinely connected with zero fake animations or simulated timers:

### Presenter Window Arrangement
Open 3 browser windows side-by-side:
- **Left Window:** Customer Table App (`http://localhost:3001`)
- **Center Window:** Kitchen Display System (`http://localhost:3002`)
- **Right Window:** Admin Dashboard (`http://localhost:3000`)

### 17-Step Demonstration Sequence

1. **Customer approaches table:** Table 08 displays ambient deep-space branding with live WebSocket indicator (`⚡ LIVE WEBSOCKET`).
2. **Welcome screen:** Tap **"Tap Screen to Start Dining"**; table session opens in PostgreSQL and loads catalog.
3. **Browse menu:** Filter categories (Steaks & Mains, Starters, Cocktails) or use real-time search.
4. **Select food:** Tap **"Prime Wood-Fired Wagyu Ribeye"** ($68.00) to open the interactive customization modal.
5. **Customize food:** Choose **Medium Rare**, side **Truffle Parmesan Fries** (+ $4.00), sauce **Red Wine Demi-Glace**, and add special chef notes.
6. **Add to cart:** Tap **"Add to Order"**; cart counter pulses and records itemized modifiers.
7. **Place order:** Open Cart, choose 20% tip, and tap **"Place Order & Send to Kitchen"**. Server calculates tax with Decimal precision and commits order with idempotency key. Table transitions to **Live Order Tracker**.
8. **Order appears in KDS:** KDS (Center Window) receives WebSocket `ORDER_CREATED` event in <50ms, sounds dual-tone kitchen chime, and displays Order #ORD-XXXX at the head of the line.
9. **Kitchen accepts:** Line cook taps **"Accept Order"** (`CONFIRMED`).
10. **Kitchen prepares:** Line cook taps **"Start Cooking"** (`PREPARING`). KDS elapsed cook timer starts ticking.
11. **KDS marks ready:** Line cook taps **"Mark Ready"** (`READY`). Ticket card turns bright emerald green.
12. **Table receives real-time update:** Table 08 receives targeted `ORDER_READY` WebSocket event (isolated to Table 08).
13. **Customer receives status:** Customer screen timeline updates to **READY** and drops down announcement: `"🍽️ Kitchen Announcement: Your dishes are prepared and being served to Table 08!"`.
14. **Admin dashboard updates:** Admin Console (Right Window) Live Orders table reflects status **READY** in real time via WebSocket.
15. **Analytics update:** Admin Analytics tab updates Today's Revenue ($92.52), Order Count, Average Order Value (AOV), and kitchen prep latency.
16. **AI image/content demonstration:**
    - Table AI Sommelier: Ask for wine pairing for the Wagyu Ribeye; Gemini AI streams back sommelier tasting notes.
    - Security Guardrail: Attempting prompt injection to discount prices is blocked by `SafetyValidator`.
    - Admin AI Studio: Generates promotional marketing campaigns and food imagery.
17. **Table device status demonstration:** Admin Hardware Fleet tab inspects Table 08: online status, 4-second heartbeat pulse, CPU/RAM load, thermals (41.8°C), 10-point capacitive digitizer status, and emergency staff PIN unlock (`1234`) using constant-time verification.

---

## 5. Automated Testing & Verification

Run the automated test suite verifying configuration management, error handling, database transactions, order lifecycles, and security:

```bash
# Run backend pytest suite (116 tests)
npm test

# Verify TypeScript compilation across all frontends
npx tsc --noEmit --project apps/customer-app/tsconfig.json
npx tsc --noEmit --project apps/kds-app/tsconfig.json
npx tsc --noEmit --project apps/admin-dashboard/tsconfig.json
```

---

## 6. Security & Production Guarantees
- **Zero Fake Animations**: All real-time updates are driven by true WebSocket events and PostgreSQL transactions.
- **Strict Multi-Tenant Table Scoping**: Dining tables strictly receive events for their own assigned table ID.
- **Deterministic Business Logic**: AI is mathematically sandboxed and prohibited from modifying prices, taxes, discounts, or permissions.
- **Kiosk Mode Lockdown**: Table screens run in full-screen kiosk mode with emergency PIN unlock (`1234`) protected against timing attacks via `secrets.compare_digest`.
- **Zero Secrets in Version Control**: All sensitive configurations are read exclusively from environment variables.

