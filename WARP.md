# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a 4D BIM (Building Information Modeling) web application that combines construction schedules with 3D building models to visualize project progress over time.

High level:
- **Frontend**: Next.js App Router (TypeScript, React, Tailwind) under `app/` and `components/`.
- **Backend**: Next.js route handlers under `app/api/**`, using Prisma to talk to a PostgreSQL database.
- **Domain**: Projects, tasks, models, elements, and links between schedule tasks and 3D model elements (4D simulation).
- **3D/4D**: Speckle-based viewer integration plus Three.js, with dedicated simulation and schedule management tabs per project.

## Key commands

All commands below assume the working directory is the project root.

### Install dependencies

- Install Node dependencies:
  - `npm install`

### Database & Prisma

The app uses PostgreSQL with Prisma. The connection string is configured via the `DATABASE_URL` environment variable (see `prisma/schema.prisma`).

Common database-related commands:
- Generate Prisma client (also run automatically on `npm install` via `postinstall`):
  - `npx prisma generate`
- Apply migrations during development:
  - `npm run prisma:migrate`
- Open Prisma Studio (DB browser):
  - `npm run prisma:studio`
- Seed the database (uses `prisma/seed.ts`):
  - `npm run seed`

### Running the app

- Start the Next.js dev server:
  - `npm run dev`
  - Dev server runs on `http://localhost:3000` by default.
- Build for production:
  - `npm run build`
- Start the production build (after `npm run build`):
  - `npm start`

### Linting

- Run ESLint on the project:
  - `npm run lint`

### Testing

This repo uses Jest/Testing Library for unit/component tests and Cypress for end-to-end tests.

**Jest / unit & component tests**
- Run all Jest tests:
  - `npm test`
- Run a single Jest test file (example for the dashboard stats component):
  - `npx jest components/dashboard/__tests__/StatsCards.test.tsx --runInBand`

**Cypress / end-to-end tests**
- Cypress is installed as a dependency and configured via `cypress.config.ts` with tests under `cypress/e2e/` (for example, `cypress/e2e/auth.cy.ts` for auth flows).
- Run Cypress tests via the CLI, e.g.:
  - `npx cypress open` (interactive runner)
  - `npx cypress run` (headless)

You may want the dev server running (`npm run dev`) before executing Cypress tests.

## High-level architecture

### Next.js App Router structure (`app/`)

- `app/layout.tsx` defines the root HTML layout, global Inter font, and toast provider (`<Toaster />`).
- `app/page.tsx` immediately redirects to `/login`, so the **login flow** is the primary entry point.
- `app/login/page.tsx` and `app/register/page.tsx` implement the authentication UI.
- `app/dashboard/page.tsx` is the authenticated landing page:
  - Reads the `token` cookie via `cookies()`.
  - Calls `verifyToken` from `lib/auth` to resolve the current user.
  - Loads user projects and recent activity via Prisma (`lib/db`).
  - Renders high-level metrics (`StatsCards`), recent activity, and the project grid.
- `app/project/[id]/page.tsx` is the main **project workspace**:
  - Enforces access via the same cookie/JWT pattern.
  - Queries a project with related models, tasks (with children and element links), and project members.
  - Renders a `ProjectHeader` (high-level project info/actions) and `ProjectTabs` to switch between major functional areas.
- Other top-level routes include `app/profile/page.tsx` (user profile/settings) and any authentication-related API UIs.

The app uses server components for data-loading pages (`async` components that call Prisma directly) and client components in `components/` for interactive UI.

### API layer (`app/api/**`)

Route handlers under `app/api/` implement the backend for the app, typically returning JSON and using Prisma.
Key groups:
- `app/api/auth/**` – user registration, login, and related auth operations.
- `app/api/projects/**` – project CRUD and nested resources:
  - `app/api/projects/route.ts` handles listing and creating projects for the authenticated user.
  - `app/api/projects/[id]/route.ts` fetches and updates a single project, enforcing that only project admins/managers can modify details.
  - Nested endpoints under `app/api/projects/[id]/…` cover analytics, MS Project imports, members, and tasks.
- `app/api/models/**` – upload and query BIM models and their derived `Element` records.
- `app/api/tasks/**` – task progress updates (e.g., `/api/tasks/[id]/progress`).
- `app/api/links/**` – CRUD for `ElementTaskLink` records that connect elements to tasks.
- `app/api/users/me/**` – user self-service endpoints (profile, password change).
- `app/api/error-logs/route.ts` – logging structured errors using `lib/error-logger` and the `ErrorLog` model.
- `app/api/speckle/**` – integration points for pulling data from Speckle.
- `app/api/ai/suggest-links/route.ts` – AI-powered link suggestions between tasks and model elements.

Authentication for these endpoints uses `getTokenFromRequest` from `lib/auth` to read a `Bearer` token from the `Authorization` header and `verifyToken` to resolve the user.

### Data layer (Prisma & database)

- `prisma/schema.prisma` defines the canonical data model. Key models:
  - `User` – logins, roles, and relationships to projects, activity logs, and error logs.
  - `Project` – core container for schedules and models.
  - `ProjectUser` – many-to-many join between users and projects with a `role` (e.g., admin/manager/member).
  - `Model` – individual BIM model uploads associated with a `Project`.
  - `Element` and `ElementProperty` – building elements extracted from 3D models and their key-value properties.
  - `Task` – schedule tasks with hierarchy (`parent`/`children`), planned and actual dates, duration, progress, and dependencies.
  - `Dependency` – task predecessors/successors, with a `type` such as `FS`.
  - `ElementTaskLink` – links between tasks and elements, including optional planned start/end for that link.
  - `ProgressLog` – historical task progress snapshots.
  - `ElementStatus` – time-based status/progress per element (optionally tied to a task).
  - `ActivityLog` – audit trail for user/project actions.
  - `ErrorLog` – structured error logging for server-side failures.
- Prisma client generation is configured with `generator client` outputting to `src/generated/`, and those generated types/models are consumed across the app.
- `lib/db.ts` centralizes Prisma client instantiation and uses a `globalForPrisma` pattern to avoid multiple client instances in dev.

### Authentication & authorization

- `lib/auth.ts` handles all auth primitives:
  - Password hashing/verification via `bcryptjs`.
  - JWT creation with `generateToken` (user id/email/role payload, 7-day expiry) using `JWT_SECRET`.
  - `verifyToken` to decode and validate JWTs.
  - `getTokenFromRequest` to extract `Bearer` tokens from `Authorization` headers for API routes.
- Page-level auth (`app/dashboard/page.tsx`, `app/project/[id]/page.tsx`) relies on the `token` cookie and redirects to `/login` if absent/invalid.
- Fine-grained authorization is implemented in APIs (e.g., `checkProjectAdminOrManager` in `app/api/projects/[id]/route.ts`) to ensure only privileged project members can mutate resources.

### 4D simulation & schedule management

The 4D functionality is primarily implemented in project-scoped client components under `components/project/`:

- **Tabs & viewers**
  - `components/project/ProjectTabs.tsx` organizes high-level tabs such as **Model Viewer**, **Schedule Manager**, **4D Simulation**, **Analytics**, **Team Management**, **Import/Export**, etc.
  - `components/project/SpeckleViewer.tsx` bridges Speckle’s viewer into the React app and exposes methods for color filtering, isolating elements, etc.
  - `components/project/ThreeViewer.tsx` provides a Three.js-based viewer for other visualization needs.

- **ScheduleManager tab** (`components/project/tabs/ScheduleManager.tsx`)
  - Periodically fetches project tasks via `/api/projects/{id}/tasks`.
  - Uses `calculateCriticalPath` from `lib/utils` to compute the critical path and highlights those tasks in the Gantt chart and task list.
  - Renders an interactive `GanttChart` for tasks and their dependencies.
  - Provides inline editing for task progress and actual dates, persisting changes via `/api/tasks/{id}/progress` and reloading from the server.

- **FourDSimulation tab** (`components/project/tabs/FourDSimulation.tsx`)
  - Fetches element-task links (`/api/links?projectId=…`) and tasks (`/api/projects/{id}/tasks`).
  - Uses `calculateCriticalPath` to identify critical tasks and visually distinguish critical elements.
  - Drives the Speckle viewer via `SpeckleViewerRef` to:
    - Ghost all elements, then selectively un-ghost and color elements based on schedule state (planned vs. actual, ahead/on-time/behind).
    - Toggle a critical-path overlay.
  - Provides a timeline-based playback with adjustable speed, scrubbing, and date overlays.
  - Supports screenshot and video capture via `html2canvas` and `lib/video-recorder`, with an optional conceptual API (`/api/video-export`) for server-side export.

The shared scheduling logic lives in `lib/utils.ts` (`calculateCriticalPath`, date helpers) so both ScheduleManager and FourDSimulation stay in sync.

### External integrations & utilities

- **Speckle integration**
  - `lib/speckle-client.ts` wraps `@speckle/shared` in a `SpeckleRealtimeClient` class for subscribing to stream commit events and managing subscriptions.
  - `lib/speckle-element-extractor.ts` uses `@speckle/objectloader` to:
    - Fetch a commit’s referenced object from a Speckle server.
    - Traverse the object graph and extract individual building elements, inferring categories from `speckle_type` and related fields.
    - Produce normalized element records (`guid`, category, family, type name, level, parameters) suitable for persistence as `Element` rows.

- **MS Project import**
  - `lib/msproject-parser.ts` parses MS Project XML files using `fast-xml-parser` and outputs:
    - Normalized tasks (UID, name, start/end dates, duration, outline-based parent relationships).
    - Normalized dependencies with mapped dependency types (`FF`, `FS`, `SF`, `SS`).
  - This is used by the `import-msproject` project API route to bulk-create tasks and dependencies.

- **Error logging**
  - `lib/error-logger.ts` exposes `logError(message, options)` which creates `ErrorLog` entries via Prisma, capturing severity level, optional user/project IDs, stack traces, and extra context.
  - API routes can call this for robust, queryable server-side error tracking.

- **General utilities** (`lib/utils.ts`)
  - `cn` combines class names with `clsx`/`tailwind-merge`.
  - Date formatting (`formatDate`, `formatDateTime`) and conversion (`toDate`).
  - File download helper `downloadFile` for browser blobs.
  - `calculateProgress` to compute average task progress.
  - `calculateCriticalPath` implements CPM forward/backward passes over task graphs and is a central piece of the scheduling logic.

### UI component system

- `components/ui/` contains a small design system wrapping Radix UI primitives and Tailwind classes:
  - Buttons, cards, dialogs, inputs, selects, tabs, tables, sliders, switches, etc.
  - Toast notifications are wired via `sonner` and used throughout the app (e.g., in schedule and simulation flows).
- `components/dashboard/` and `components/project/` implement higher-level, domain-specific UIs that compose these primitives.

### Testing structure

- **Jest / Testing Library**
  - Configured via `jest.config.js` using `next/jest` and `ts-jest`.
  - Uses `jest-environment-jsdom` and maps `@/components/*` and `@/lib/*` via `moduleNameMapper`.
  - Example tests live under `__tests__` directories (e.g., `components/dashboard/__tests__/StatsCards.test.tsx` and `app/api/auth/__tests__/auth.test.ts`).

- **Cypress**
  - Configured with `cypress.config.ts`.
  - E2E tests live in `cypress/e2e/`, for example `cypress/e2e/auth.cy.ts` which covers registration, login, logout, and invalid credential flows against the `/api/auth` endpoints and the `/login`/`/dashboard` pages.

## How to extend or modify behavior safely

- Prefer to extend existing API route handlers under `app/api/**` and reuse shared utilities in `lib/` instead of inlining logic in components.
- When working with schedules or progress, centralize new logic in `lib/utils.ts` where possible so both ScheduleManager and FourDSimulation stay consistent.
- For new BIM/model-based features, consider whether they should be driven through Speckle (`lib/speckle-*`, `SpeckleViewer`) or through additional Prisma models derived from Speckle object data, to keep 3D and database state in sync.
