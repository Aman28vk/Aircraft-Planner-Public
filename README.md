# Aircraft Lifecycle Management & Task Planner

A complete enterprise-grade web application designed to manage the end-to-end operational lifecycle, functional teams, tasks, and sequential/parallel dependency chains for commercial aircraft tracked by **MSN (Manufacturer Serial Number)**.

Inspired by Microsoft Planner, tailored for commercial aerospace programs, teardown operations, asset management, and parts inventory certification.

---

## ✈ Key Features

- **MSN Lifecycle Projects**: Dedicated project lifecycle per aircraft (MSN 12345, 12346, 12347) across 9 configurable stages:
  - `01 BIDDING`
  - `02 ACQUISITION`
  - `03 TEARDOWN PREPARATION`
  - `04 FLIP / TEARDOWN`
  - `05 TEARDOWN IN PROCESS`
  - `06 WAREHOUSE`
  - `07 SALES`
  - `08 INVENTORY`
  - `09 CLOSED`
- **Dynamic Task Dependency Engine**:
  - Directed Acyclic Graph (DAG) dependency resolution supporting sequential and parallel tasks.
  - Completing predecessor tasks automatically transitions successor tasks from `WAITING` to `READY`.
  - Dispatches automated in-app notifications and transactional emails to assigned personnel.
- **Planner-Inspired Views**:
  - **Task Board**: Interactive card board grouped by Lifecycle Stage or Functional Team, drag & drop card movements, checklists preview with `2 / 4` progress counters, priority badges, and dependency locks.
  - **Grid View**: Dense spreadsheet table with sorting, filtering, inline status editing, column toggles, and instant CSV export.
  - **Timeline View**: Interactive Gantt schedule by aircraft stage and task with zoom controls (`Day`, `Week`, `Month`, `Quarter`).
  - **Calendar View**: Monthly schedule highlighting start/due dates, overdue milestones, and task drawers.
  - **Analytics & Dashboard**: Fleet KPI cards, milestone progress bars, and team velocity metrics.
- **Enterprise RBAC & Team Management**:
  - Roles: `SUPER_ADMIN`, `TEAM_ADMIN`, `TEAM_MEMBER`, `VIEWER`.
  - Configurable Teams: Asset, Sales, Technical, Teardown, Warehouse, Finance, Management.
  - Interactive top-bar role switcher to test permissions across all operational roles.
- **Transactional Email System & Dev Outbox Inspector**:
  - Production driver for **Resend** transactional email API.
  - Built-in interactive **Dev Email Outbox Inspector** modal in the header bar allowing developers and operations teams to review rendered HTML emails in desktop and mobile viewport modes without external dependencies.
- **Dual Database Layer (PostgreSQL + Local Durable Store)**:
  - Complete normalized PostgreSQL schema and seed migrations in `supabase/migrations/`.
  - Seamless zero-configuration fallback to an in-browser durable relational storage engine preloaded with MSN 12345/12346/12347 data.

---

## 🛠 Quick Start (Running Locally)

### 1. Prerequisites
- Node.js `v18+` (Tested on Node `v24` and npm `11`)

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Contents of `.env`:
```env
# Optional: Live Supabase PostgreSQL Connection
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Optional: Resend Transactional Email API Key
RESEND_API_KEY=
EMAIL_FROM=ops@alarisaerospace.com
```
*(If left blank, the application transparently runs in High-Performance Local Engine mode with complete offline durability and interactive email outbox inspection).*

### 4. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 5. Run Automated Workflow Test Suite
To verify the mandatory workflow test scenario programmatically:
```bash
npx tsx src/testWorkflow.ts
```

---

## 🗄 Database & Supabase Migrations

All SQL migrations are structured and versioned in `supabase/migrations/`:

1. `supabase/migrations/001_initial_schema.sql`:
   - Normalized tables: `profiles`, `teams`, `team_members`, `lifecycle_stages`, `aircraft`, `task_templates`, `template_tasks`, `tasks`, `task_checklists`, `task_dependencies`, `comments`, `attachments`, `notifications`, `email_logs`, `activity_logs`, `audit_logs`.
   - Performance B-Tree indexes on `msn`, `status`, `assigned_user_id`, `team_id`, `due_date`, `aircraft_id`.
   - Row Level Security (RLS) policies for `SUPER_ADMIN`, `TEAM_ADMIN`, `TEAM_MEMBER`, `VIEWER`.
2. `supabase/migrations/002_sample_data.sql`:
   - Sample aircraft fleet (`MSN 12345`, `MSN 12346`, `MSN 12347`).
   - Standard teams, users with roles, and the initial dependency chain.

To apply directly to Supabase:
- Run migrations using the Supabase CLI (`supabase db push`) or paste into the Supabase SQL Editor.

---

## 🧪 Verification Walkthrough (Core Scenario)

1. Open the application (Default logged in as **Super Admin**).
2. Select **MSN 12345** from the Project Switcher in the top bar or click on the **Board** tab.
3. Locate **Task 1: Technical Acceptance** (Asset Team, Assigned: John Smith) &bull; Status: `IN PROGRESS`.
4. Locate **Task 2: Harvest List Preparation** (Asset Team, Assigned: Aman Kumar) &bull; Status: `WAITING`.
5. Open Task 1 and click **"Mark Complete"**:
   - Task 1 immediately transitions to `COMPLETED`.
   - The workflow engine evaluates the dependency graph and transitions Task 2 to `READY TO START`.
   - An in-app notification is generated for **Aman Kumar**.
   - A transactional email is drafted for **Aman Kumar**.
6. Click the **Outbox (✉️)** button in the top bar to inspect the dispatched HTML notification email.
7. Mark Task 2 as completed &bull; observe Task 3 (**Teardown Coordination**, Sarah Connor) automatically unlocks and notifies Sarah.

---

## 🚀 Production Build

```bash
npm run build
npm run preview
```

---

## 📄 License & Proprietary Notice

Aircraft Lifecycle Management System &bull; Alaris Aerospace Systems LLC.
