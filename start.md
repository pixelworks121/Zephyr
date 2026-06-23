# Zephyr — Complete Project Guide

**AI-Powered Lead Generation & CRM Platform for Pixel Works**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Getting Started (Local Setup)](#getting-started)
5. [Running the Project](#running-the-project)
6. [Package Breakdown](#package-breakdown)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Frontend Pages & Routes](#frontend-pages--routes)
10. [AI Engine Pipeline](#ai-engine-pipeline)
11. [Scraper Pipeline](#scraper-pipeline)
12. [Environment Variables](#environment-variables)
13. [Default Test Credentials](#default-test-credentials)

---

## Project Overview

Zephyr is a full-stack CRM platform designed for **Pixel Works**, a digital services agency. It automates:

- **Lead Discovery**: Scrapes Google, Google Maps, and Product Hunt for potential clients
- **Lead Enrichment**: Uses Hunter.io and Apollo.io APIs to find contact information
- **AI Analysis**: Multi-agent AI pipeline (Claude + GPT) analyzes, scores, and generates pitches for leads
- **Lead Management**: Full CRM with status tracking, activity logging, and follow-up scheduling
- **Team Management**: Admin/employee roles with performance tracking and reporting

The platform is built as a **monorepo** with 5 packages working together.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│                  localhost:5173                          │
│                                                         │
│  LoginPage │ Dashboard │ Leads │ FollowUps │ Admin      │
│                                                         │
│         Vite dev server proxies /api → :5000            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST API
┌──────────────────────┴──────────────────────────────────┐
│                    Backend (Express)                     │
│                  localhost:5000                          │
│                                                         │
│  Auth │ Leads │ Employees │ Activities │ FollowUps      │
│  Admin Reports │ AI Analysis │ Pipeline Trigger         │
│                                                         │
│              Prisma ORM → PostgreSQL                    │
└──────┬────────────────────────────┬─────────────────────┘
       │                            │
       ▼                            ▼
┌──────────────┐          ┌──────────────────┐
│  AI Engine   │          │     Scraper      │
│  (Claude +   │          │  (Playwright +   │
│   GPT APIs)  │          │  Google/Hunter/  │
│              │          │  Apollo APIs)     │
└──────────────┘          └──────────────────┘
```

---

## Tech Stack

| Package       | Technology                                                    |
| ------------- | ------------------------------------------------------------- |
| **client**    | React 18, Vite, Tailwind CSS, React Router, React Query, Zustand, Recharts, Lucide Icons |
| **server**    | Node.js, Express, Prisma ORM, PostgreSQL, JWT, bcryptjs, Zod |
| **ai-engine** | Anthropic Claude SDK, OpenAI SDK (ESM modules)               |
| **scraper**   | Playwright, Google Custom Search API, Google Maps API, Hunter.io API, Apollo.io API |
| **shared**    | Plain JavaScript constants and utilities (CommonJS)           |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** database (local or cloud like Supabase/Neon)
- **npm** (comes with Node.js)

### Step 1: Navigate to the project

```bash
cd "/Users/shresthchauhan/Documents/project/our app/Zephyr"
```

### Step 2: Install all dependencies

```bash
npm install
```

This installs dependencies for all 5 packages at once via npm workspaces.

### Step 3: Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
# Required for the server to start
DATABASE_URL=postgresql://username:password@localhost:5432/zephyr
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d

# Required for the AI engine (optional for basic CRM use)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Required for lead discovery (optional for basic CRM use)
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
GOOGLE_MAPS_API_KEY=...

# Required for lead enrichment (optional for basic CRM use)
HUNTER_API_KEY=...
APOLLO_API_KEY=...

# Server config
PORT=5000
NODE_ENV=development

# Client config (must match Vite proxy)
VITE_API_URL=http://localhost:5000/api
CLIENT_URL=http://localhost:5173
```

### Step 4: Create the database

Make sure PostgreSQL is running, then push the schema:

```bash
npm run db:push -w server
```

Or equivalently:

```bash
cd server && npx prisma db push
```

This creates all tables (User, Lead, Activity, FollowUp) in your database.

### Step 5: (Optional) Open Prisma Studio

To visually browse/edit your database:

```bash
npm run db:studio -w server
```

Opens at `http://localhost:5555`.

### Step 6: Create your first user

Register via the API or the frontend. The first user should be an admin:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@pixelworks.com","password":"admin12345","role":"ADMIN"}'
```

---

## Running the Project

### Run everything at once

```bash
npm run dev
```

This starts the server (port 5000) and client (port 5173) concurrently.

### Run individually (in separate terminals)

```bash
# Terminal 1 — Backend API
npm run dev:server

# Terminal 2 — Frontend UI
npm run dev:client

# Terminal 3 — (Optional) Scraper scheduler
npm run dev:scraper

# Terminal 4 — (Optional) AI engine test runner
npm run dev:ai
```

### Open the application

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Prisma Studio**: [http://localhost:5555](http://localhost:5555) (after `db:studio`)

### Available npm scripts

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start all packages                         |
| `npm run dev:client`   | Start frontend only (Vite on :5173)        |
| `npm run dev:server`   | Start backend only (Express on :5000)      |
| `npm run dev:scraper`  | Start scraper scheduler                    |
| `npm run dev:ai`       | Run AI engine                              |
| `npm run build`        | Build all packages for production          |
| `npm run db:push -w server`  | Push Prisma schema to database      |
| `npm run db:studio -w server` | Open Prisma Studio database browser |

---

## Package Breakdown

### `@zephyr/shared` — Shared Constants & Utilities

Located at `/shared/`. Used by both server and client.

| Export                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `LEAD_STATUSES`        | Object with all 10 status enum values         |
| `LEAD_STATUS_LABELS`   | Human-readable labels for each status         |
| `INDUSTRIES`           | Array of 20 common industry names             |
| `formatDate(date)`     | Formats date as "Jan 1, 2026"                 |
| `slugify(text)`        | Converts text to URL-safe slug                |

---

### `@zephyr/server` — Backend API

Located at `/server/`. Express.js REST API with Prisma ORM.

#### Middleware

| File                    | Export           | Purpose                                  |
| ----------------------- | ---------------- | ---------------------------------------- |
| `auth.middleware.js`    | `verifyToken`    | JWT verification, attaches `req.user` from DB |
| `role.middleware.js`    | `requireAdmin`   | Blocks non-ADMIN users (403)             |
| `role.middleware.js`    | `requireEmployee`| Allows ADMIN or EMPLOYEE                 |
| `error.middleware.js`   | `errorHandler`   | Global error handler, Prisma error codes |

#### Controllers & Routes

**Auth** (`/api/auth`)

| Method | Path         | Auth    | Description                          |
| ------ | ------------ | ------- | ------------------------------------ |
| POST   | `/register`  | None    | Create account, returns JWT          |
| POST   | `/login`     | None    | Login, returns JWT                   |
| GET    | `/me`        | Bearer  | Get current user profile             |
| PUT    | `/profile`   | Bearer  | Update own name                      |

**Leads** (`/api/leads`)

| Method | Path               | Auth    | Description                          |
| ------ | ------------------ | ------- | ------------------------------------ |
| POST   | `/`                | Bearer  | Create a new lead                    |
| GET    | `/`                | Bearer  | List leads (paginated, filterable)   |
| GET    | `/stats`           | Bearer  | Lead statistics                      |
| GET    | `/:id`             | Bearer  | Get lead detail with activities      |
| PUT    | `/:id`             | Bearer  | Update lead fields                   |
| DELETE | `/:id`             | Admin   | Delete lead + related data           |
| PUT    | `/:id/assign`      | Admin   | Assign lead to employee              |
| POST   | `/bulk-import`     | Admin   | Import up to 100 leads from CSV      |

**Employees** (`/api/employees`) — Admin only

| Method | Path                    | Description                      |
| ------ | ----------------------- | -------------------------------- |
| GET    | `/`                     | List all employees with stats    |
| GET    | `/:id`                  | Get employee with assigned leads |
| PUT    | `/:id`                  | Update employee name/role        |
| DELETE | `/:id`                  | Delete employee                  |
| GET    | `/:id/performance`      | Employee performance metrics     |

**Activities** (`/api/activities`)

| Method | Path               | Auth    | Description                          |
| ------ | ------------------ | ------- | ------------------------------------ |
| POST   | `/`                | Bearer  | Log an activity on a lead            |
| GET    | `/`                | Admin   | All activities with summary          |
| GET    | `/me`              | Bearer  | Current user's activities            |
| GET    | `/lead/:leadId`    | Bearer  | Activities for a specific lead       |
| DELETE | `/:id`             | Bearer  | Delete activity (not STATUS_CHANGE)  |

**Follow-ups** (`/api/followups`)

| Method | Path               | Auth    | Description                          |
| ------ | ------------------ | ------- | ------------------------------------ |
| POST   | `/`                | Bearer  | Schedule a follow-up                 |
| GET    | `/`                | Admin   | All follow-ups with summary          |
| GET    | `/me`              | Bearer  | Current user's follow-ups            |
| GET    | `/lead/:leadId`    | Bearer  | Follow-ups for a specific lead       |
| PUT    | `/:id`             | Bearer  | Update follow-up date/note           |
| PUT    | `/:id/done`        | Bearer  | Mark follow-up as completed          |
| DELETE | `/:id`             | Admin   | Delete follow-up                     |

**Admin Reports** (`/api/admin`) — Admin only

| Method | Path                    | Description                      |
| ------ | ----------------------- | -------------------------------- |
| GET    | `/overview`             | Dashboard overview stats         |
| GET    | `/reports/daily`        | Daily report (date range)        |
| GET    | `/reports/weekly`       | Weekly report                    |
| GET    | `/reports/monthly`      | Monthly report                   |
| GET    | `/reports/pipeline`     | Pipeline stage analysis          |
| GET    | `/reports/followups`    | Follow-up health report          |
| GET    | `/team`                 | Team performance breakdown       |
| GET    | `/sources`              | Lead source analytics            |
| GET    | `/activity/recent`      | Recent activity feed             |

**AI** (`/api/ai`)

| Method | Path               | Auth    | Description                          |
| ------ | ------------------ | ------- | ------------------------------------ |
| POST   | `/analyze/:id`     | Bearer  | Run full AI pipeline on a lead       |
| POST   | `/batch-analyze`   | Admin   | Batch analyze up to 10 leads         |
| POST   | `/discuss/:id`     | Admin   | Multi-agent discussion analysis      |
| GET    | `/status`          | Bearer  | AI engine status and usage           |

**Pipeline** (`/api/pipeline`)

| Method | Path       | Auth    | Description                          |
| ------ | ---------- | ------- | ------------------------------------ |
| POST   | `/run`     | Admin   | Trigger discovery pipeline           |
| GET    | `/status`  | Bearer  | Pipeline status and usage            |
| GET    | `/usage`   | Admin   | API usage stats (Hunter/Apollo)      |

---

### `@zephyr/client` — Frontend UI

Located at `/client/`. React SPA with dark theme.

#### Pages

| Page              | Route              | Auth      | Role    | Description                            |
| ----------------- | ------------------ | --------- | ------- | -------------------------------------- |
| LoginPage         | `/login`           | Public    | —       | Email/password login form              |
| EmployeeDashboard | `/dashboard`       | Protected | Any     | Personal dashboard with stats, charts  |
| LeadsPage         | `/leads`           | Protected | Any     | Full leads table with filters          |
| LeadDetailPage    | `/leads/:id`       | Protected | Any     | Lead detail with activities & follow-ups |
| FollowUpsPage     | `/followups`       | Protected | Any     | Follow-up management with tabs         |
| ActivitiesPage    | `/activities`      | Protected | Any     | Activity log with filters              |
| AdminDashboard    | `/admin`           | Protected | Admin   | Overview stats and charts              |
| TeamPage          | `/admin/team`      | Protected | Admin   | Team management                        |
| ReportsPage       | `/admin/reports`   | Protected | Admin   | Daily/weekly/monthly reports           |
| SourcesPage       | `/admin/sources`   | Protected | Admin   | Lead source analytics                  |

#### State Management

- **Zustand** (`authStore`): Stores user + token in localStorage, persists across refreshes
- **React Query**: Server state, caching (30s stale time), automatic refetching

#### Key Features

- Dark theme (near-black backgrounds, indigo accents)
- Responsive sidebar (collapses on mobile with hamburger menu)
- Toast notifications for success/error feedback
- Skeleton loaders for loading states
- Empty states with action buttons
- Confirm dialogs for destructive actions

---

### `@zephyr/ai-engine` — AI Pipeline

Located at `/ai-engine/`. ESM module. Uses Claude for analysis/scoring/pitching and GPT for review.

#### The 4-Step Pipeline

```
Lead → [1. Analyze] → [2. Score] → [3. Review/Discuss] → [4. Pitch] → Result
           Claude        Claude       GPT/Claude Debate      Claude
```

1. **Analyze** (`lead-analyzer.js`): Claude analyzes the lead's business, digital presence, and pain points
2. **Score** (`lead-scorer.js`): Claude scores 1-10 based on service alignment, budget potential, growth stage
3. **Review** (`reviewer-agent.js`): GPT provides independent second-opinion review
   - OR **Discussion** (`discussion.js`): Claude Alpha vs GPT Beta multi-round debate
4. **Pitch** (`pitch-generator.js`): Claude generates cold email, follow-up email, and call script

#### Prompts

- `analyze.prompt.js`: Instructs Claude as a senior BD analyst for Pixel Works
- `score.prompt.js`: Weighted scoring criteria (service alignment 30%, budget 25%, growth 20%, reachability 15%, geography 10%)
- `pitch.prompt.js`: Expert sales copywriter generating email sequences and call scripts

#### Pixel Works Services (used in prompts)

Web Development, SEO & Content Marketing, Paid Advertising, Brand Identity & Design, Social Media Management, Email Marketing, Custom Web Applications, E-Commerce Solutions, Analytics & Data, Mobile App Development

---

### `@zephyr/scraper` — Lead Discovery

Located at `/scraper/`. ESM module. Discovers and enriches leads from multiple sources.

#### Sources

| Source          | File              | What it does                                    |
| --------------- | ----------------- | ----------------------------------------------- |
| Google Search   | `google-search.js`| Searches Google Custom Search API for businesses|
| Google Maps     | `google-maps.js`  | Searches Google Places API for local businesses |
| Product Hunt    | `product-hunt.js` | Fetches today's top Product Hunt launches       |
| Browser Agent   | `browser-agent.js`| Uses Playwright to scrape websites for company info |

#### Enrichment

| Source           | File                | What it does                                |
| ---------------- | ------------------- | ------------------------------------------- |
| Public Contact   | `public-contact.js` | Scrapes /contact page for emails/phones (free) |
| Hunter.io        | `hunter.js`         | Domain search for professional emails       |
| Apollo.io        | `apollo.js`         | Person search + company enrichment          |

#### Pipeline

1. Discover leads from configured sources
2. Deduplicate by website hostname or company name
3. Enrich with public contact info (Playwright scraping)
4. (Optional) Enrich with Hunter.io and Apollo.io
5. Save to database via Prisma

#### Scheduler

Runs automatically 3 times daily: **8:00 AM**, **12:00 PM**, **5:00 PM**

---

## Database Schema

### User

| Field      | Type     | Notes                          |
| ---------- | -------- | ------------------------------ |
| id         | UUID     | Primary key                    |
| email      | String   | Unique                         |
| password   | String   | Bcrypt hashed                  |
| name       | String   |                                |
| role       | Enum     | ADMIN or EMPLOYEE              |
| createdAt  | DateTime | Auto-generated                 |
| updatedAt  | DateTime | Auto-updated                   |

### Lead

| Field               | Type     | Notes                          |
| ------------------- | -------- | ------------------------------ |
| id                  | UUID     | Primary key                    |
| companyName         | String   | Required                       |
| website             | String?  | Optional                       |
| industry            | String?  | Optional                       |
| country             | String?  | Optional                       |
| contactName         | String?  | Optional                       |
| email               | String?  | Optional                       |
| phone               | String?  | Optional                       |
| linkedinUrl         | String?  | Optional                       |
| twitterUrl          | String?  | Optional                       |
| businessSize        | Enum?    | SOLO/SMALL/MEDIUM/LARGE        |
| status              | Enum     | Default: NEW_LEAD              |
| source              | Enum     | Default: MANUAL                |
| aiScore             | Float?   | 1-10 score from AI             |
| aiAnalysis          | Text?    | AI analysis text               |
| whyGoodProspect     | Text?    | AI-generated                   |
| recommendedServices | Text?    | AI-generated                   |
| emailTemplate       | Text?    | AI-generated                   |
| callScript          | Text?    | AI-generated                   |
| assignedToId        | FK?      | Links to User                  |
| createdAt           | DateTime | Auto-generated                 |
| updatedAt           | DateTime | Auto-updated                   |

### Activity

| Field     | Type     | Notes                          |
| --------- | -------- | ------------------------------ |
| id        | UUID     | Primary key                    |
| leadId    | FK       | Links to Lead (cascade delete) |
| userId    | FK       | Links to User (cascade delete) |
| type      | Enum     | NOTE/CALL/EMAIL/MEETING/STATUS_CHANGE/FOLLOW_UP |
| content   | Text     |                                |
| createdAt | DateTime | Auto-generated                 |

### FollowUp

| Field       | Type     | Notes                          |
| ----------- | -------- | ------------------------------ |
| id          | UUID     | Primary key                    |
| leadId      | FK       | Links to Lead (cascade delete) |
| userId      | FK       | Links to User (cascade delete) |
| scheduledAt | DateTime | Must be in the future          |
| note        | Text?    | Optional                       |
| done        | Boolean  | Default: false                 |
| createdAt   | DateTime | Auto-generated                 |
| updatedAt   | DateTime | Auto-updated                   |

### Lead Status Flow

```
NEW_LEAD → CONTACTED → EMAIL_SENT → FOLLOW_UP_REQUIRED → INTERESTED
    ↓                                                        ↓
CLOSED_LOST ←←←←←← NEGOTIATION ←←← PROPOSAL_SENT ←← MEETING_SCHEDULED
                                                        ↓
                                                    CLOSED_WON
```

---

## Environment Variables

| Variable                | Required | Description                          |
| ----------------------- | -------- | ------------------------------------ |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string         |
| `JWT_SECRET`            | Yes      | Secret for signing JWT tokens        |
| `JWT_EXPIRES_IN`        | No       | Token expiry (default: `7d`)         |
| `PORT`                  | No       | Server port (default: `5000`)        |
| `NODE_ENV`              | No       | `development` or `production`        |
| `CLIENT_URL`            | No       | Frontend URL for CORS (default: `http://localhost:3000`) |
| `VITE_API_URL`          | No       | Client API base URL                  |
| `ANTHROPIC_API_KEY`     | For AI   | Claude API key                       |
| `OPENAI_API_KEY`        | For AI   | OpenAI API key                       |
| `GOOGLE_SEARCH_API_KEY` | For scraping | Google Custom Search API key     |
| `GOOGLE_SEARCH_ENGINE_ID` | For scraping | Google CSE ID                  |
| `GOOGLE_MAPS_API_KEY`   | For scraping | Google Places API key            |
| `HUNTER_API_KEY`        | For enrichment | Hunter.io API key               |
| `APOLLO_API_KEY`        | For enrichment | Apollo.io API key               |
| `PRODUCT_HUNT_TOKEN`    | Optional | Product Hunt API token              |

---

## Default Test Credentials

Register these via the API or frontend:

| Role     | Email                      | Password       |
| -------- | -------------------------- | -------------- |
| Admin    | admin@pixelworks.com       | admin12345     |
| Employee | employee@pixelworks.com    | employee12345  |

---

## Testing the API

Test files are in the `server/` directory (REST Client format for VS Code):

- `test-auth.http` — Auth endpoints (register, login, profile)
- `test-leads.http` — Lead CRUD, filtering, bulk import, assignment
- `test-activities.http` — Activities and follow-ups

Open these in VS Code with the **REST Client** extension and click "Send Request" on each block.

---

## Quick Start Summary

```bash
# 1. Navigate to project
cd "/Users/shresthchauhan/Documents/project/our app/Zephyr"

# 2. Install dependencies
npm install

# 3. Set up database
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm run db:push -w server

# 4. Start everything
npm run dev

# 5. Open browser
# Frontend: http://localhost:5173
# API:      http://localhost:5000/api/health

# 6. Register first admin user
# Use the frontend login page or curl command above

# 7. Start using the CRM!
```
