# CLAUDE.md — Storylab Editor

This file provides guidance to Claude Code (claude.ai/code) when working with the **Storylab Editor** implementation.

> 📖 **For product vision, technical specs, and roadmap, see [storylab-org/storylab-specs](https://github.com/storylab-org/storylab-specs)**

This repository contains **editor-specific implementation** (React + Tauri + Fastify). See the specs repo for product strategy, platform architecture, and Phase 1–3 roadmap.

## Quick Start

```bash
# Install dependencies
npm install && npm install --prefix server

# Start development
npm run tauri dev
```

The app opens with React frontend on port 1420, Fastify server on port 3000, and Tauri window managing everything.

## Architecture Overview

**Storylab** is a three-layer desktop application:

1. **React Frontend** (`src/`) → Runs in Tauri webview
2. **Fastify Server** (`server/`) → Node.js sidecar, HTTP API on port 3000
3. **Tauri/Rust** (`src-tauri/`) → Desktop app shell, spawns and manages sidecar

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for detailed architecture, data flow, and design decisions.

## Development Guide

### Prerequisites

- **Node.js** v18+ (via nvm: `nvm install && nvm use`)
- **Rust** 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Common Commands

| Command | Purpose |
|---------|---------|
| `npm run tauri dev` | Start full dev environment (frontend + server + Tauri) |
| `npm run build` | Build production binary |
| `cd server && npm run dev` | Run Fastify server standalone |
| `npm run tauri dev -- --release` | Dev with release-optimized Rust |

Full development guide: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**

### Key Ports

- **1420** → Vite dev server (frontend)
- **3000** → Fastify server (backend)
- **1421** → Vite HMR (hot reload)

## File Structure

```
storylab/
├── src/                    # React frontend
├── server/                 # Fastify sidecar server
├── src-tauri/              # Tauri/Rust backend
├── test/                   # Unified test suite
│   ├── frontend/           # React + Vitest tests
│   ├── server/             # Fastify + node:test tests
│   └── e2e/                # WebDriver E2E tests (Linux)
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md     # System design
│   ├── DEVELOPMENT.md      # Dev workflow
│   ├── TESTING.md          # Testing guide
│   ├── LOGGING.md          # Logging setup
│   ├── SIDECAR.md          # Fastify server guide
│   ├── BUILDING.md         # Building & deployment
│   ├── EDITOR_TOOLBAR.md   # Editor toolbar features & implementation
│   ├── DRAFT_BOARD.md      # Draft board planning canvas
│   └── SIDEBAR_MENU.md     # Sidebar menu & export functionality
├── ROADMAP_2026.md         # Implementation roadmap with priorities
├── CLAUDE.md               # This file
└── package.json
```

## Roadmap

### [ROADMAP_2026.md](ROADMAP_2026.md)
Implementation roadmap with prioritised phases: Phase 1 (Core Writing ✅), Phase 2 (Chapter Structure), Phase 3 (Entity System), Phase 4 (Annotations), Phase 5 (Draft Board), Phase 6 (Export & Polish).

**Read this to:** Understand what's next, estimate effort, align on priorities.

## Documentation

### [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
System design, three-layer architecture, data flow, component responsibilities.

**Read this to understand:** How the frontend, server, and Rust layers work together.

### [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
Development workflow, common commands, debugging, troubleshooting, git workflow.

**Read this to:** Start development, debug issues, add dependencies.

### [docs/TESTING.md](docs/TESTING.md)
Comprehensive testing guide for all three layers (frontend, server, Rust). Test structure, patterns, best practices, CI/CD integration.

**Read this to:** Write tests, run test suites, understand testing conventions, set up CI/CD.

### [docs/LOGGING.md](docs/LOGGING.md)
Comprehensive logging across frontend (browser), server (Pino), and Rust (env_logger).

**Read this to:** View/debug logs, add logging to code, configure log levels.

### [docs/SIDECAR.md](docs/SIDECAR.md)
Fastify server details, adding routes, adding middleware, lifecycle, bundling, security.

**Read this to:** Add API endpoints, understand server architecture, add middleware.

### [docs/BUILDING.md](docs/BUILDING.md)
Building for production, bundling, distribution, code signing, CI/CD, troubleshooting.

**Read this to:** Build a release, distribute the app, set up automated builds.

### [docs/EDITOR_TOOLBAR.md](docs/EDITOR_TOOLBAR.md)
Complete guide to the Lexical editor formatting toolbar — current features, implementation details, how to add new features.

**Read this to:** Understand the editor toolbar, add formatting options (bold, italic, headings, quotes, code blocks), extend the editor UI.

### [docs/DRAFT_BOARD.md](docs/DRAFT_BOARD.md)
Complete guide to the draft board canvas — creating cards, managing connections, chapter linking, keyboard shortcuts, and troubleshooting.

**Read this to:** Understand the draft board, add new shapes or features, manage story structure planning, or fix connection/arrow issues.

### [docs/SIDEBAR_MENU.md](docs/SIDEBAR_MENU.md)
Complete guide to the sidebar menu system — export functionality, mocked features (import, key generation), platform-aware export (web vs Tauri).

**Read this to:** Understand the sidebar menu, implement export formats, add new menu items, handle platform-specific functionality.

## Logging

See **[docs/LOGGING.md](docs/LOGGING.md)** for comprehensive logging setup across all three layers (frontend, server, Rust).

## Frontend (React + Lexical Editor)

The React frontend uses **Lexical** (Facebook's text editor framework) with **lucide-react** icons.

See **[docs/EDITOR_TOOLBAR.md](docs/EDITOR_TOOLBAR.md)** for toolbar features, implementation details, and how to extend the editor.

## Server (Fastify Sidecar)

The Fastify server (`./server`) is a Node.js process spawned by Tauri on app startup.

See **[docs/SIDECAR.md](docs/SIDECAR.md)** for adding routes, middleware, lifecycle, and architecture details.

## Troubleshooting

See **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#troubleshooting)** for troubleshooting common issues.

## Project Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- No unused locals or parameters
- Imports must be explicit (no namespace imports)

### Testing, Logging & API Routes

See **[docs/TESTING.md](docs/TESTING.md)**, **[docs/LOGGING.md](docs/LOGGING.md)**, and **[docs/SIDECAR.md](docs/SIDECAR.md)** for detailed conventions.

## Key Decisions

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for key architectural decisions and rationale.

## Getting Help

1. **Check the docs** → Browse `docs/` directory
2. **Check logs** → Run with `RUST_LOG=debug npm run tauri dev`
3. **Check source code** → Well-commented, self-documenting
4. **TypeScript errors** → Run `npm run build` to see all type errors at once
