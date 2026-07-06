---
description: How to start the local preview dev server and test the application.
---

# Preview Project Workflow

This workflow details the commands needed to start the development preview server and verify application health locally.

## Step 1: Start Development Server
Run the Next.js development server locally:
```bash
npm run dev
```

If running inside a Project IDX / Antigravity cloud workspace with custom host/port binding:
```bash
npm run dev -- --port $PORT --hostname 0.0.0.0
```

## Step 2: Verify Application Health
- Open the provided preview URL (e.g., `http://localhost:3000` or the network IP assigned).
- Ensure core application routes compile and render cleanly without console or hydration errors:
  - `/` (Home / Dashboard)
  - `/pokedex` (Pokédex Catalog & Search)
  - `/my-collection` (User Card Collection & Management)
