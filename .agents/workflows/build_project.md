---
description: How to install dependencies, compile, and build the Next.js project.
---

# Build Project Workflow

This workflow details the exact commands required to install dependencies, verify TypeScript types, and build the Next.js production bundle.

## Step 1: Install Dependencies
Run the following command to install all required npm packages:
```bash
npm install
```

## Step 2: Verify TypeScript Types
Run the typechecker to ensure there are no TypeScript compilation errors across the codebase:
```bash
npm run typecheck
```

## Step 3: Build Production Bundle
Compile and build the production-ready Next.js application:
```bash
npm run build
```
