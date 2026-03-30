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
│   └── EDITOR_TOOLBAR.md   # Editor toolbar features & implementation
├── CLAUDE.md               # This file
└── package.json
```

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

## Logging

Three-layer logging system:

- **Frontend** (Browser console) → `logger.info()`, `logger.error()`, etc.
- **Server** (Terminal) → Pino structured logging with pretty-printing
- **Rust** (Terminal) → env_logger with `RUST_LOG=debug`

Start with all debug logs:
```bash
RUST_LOG=debug npm run tauri dev
```

Full logging guide: **[docs/LOGGING.md](docs/LOGGING.md)**

## Frontend (React + Lexical Editor)

The React frontend uses **Lexical** (Facebook's text editor framework) with modern icon support.

### Key Dependencies

- **Lexical v0.41.0** → Rich text editor framework
  - `@lexical/react`, `@lexical/list`, `@lexical/table`, `@lexical/link`, `@lexical/code`, etc.
- **lucide-react** → SVG icon library for toolbar
  - 1000+ icons, tree-shakeable, consistent styling

### Toolbar Features

The editor toolbar provides essential formatting for book writing:

- **Block type dropdown** — Switch between Normal, Heading 1–3, Quote, Code Block
- **Text formatting** — Bold, Italic, Underline (all with active state indicators)
- **Lists** — Bullet and numbered lists
- **Alignment** — Left, centre, right alignment

See **[docs/EDITOR_TOOLBAR.md](docs/EDITOR_TOOLBAR.md)** for complete toolbar documentation, how to add new features, and implementation details.

### Editor Component

Main component: `src/components/editor/LexicalEditor.tsx`
- Configures Lexical nodes and plugins
- Handles content serialisation/deserialisation
- Integrates with Fastify backend for saving

Main toolbar component: `src/components/editor/FormattingToolbar.tsx`
- Implements block type detection and conversion
- Manages active state for bold/italic/underline
- Uses DropDown UI component for block type selector

## Server (Fastify Sidecar)

The Fastify server (`./server`) is a Node.js process spawned by Tauri on app startup. It provides HTTP APIs on port 3000.

### Adding a Route

Create `server/src/routes/my-route.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify'

const myRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/my-route', async (request, reply) => {
    return { message: 'Hello from my route' }
  })
}

export default myRoute
```

The route is auto-loaded and available immediately at `GET /my-route`.

Full server guide: **[docs/SIDECAR.md](docs/SIDECAR.md)**

## Building for Release

```bash
npm run build
```

Creates distributables:
- **macOS** → `src-tauri/target/release/bundle/dmg/storylab_0.1.0_x64.dmg`
- **Windows** → `src-tauri/target/release/bundle/msi/storylab_0.1.0_x64_en-US.msi`

Full build guide: **[docs/BUILDING.md](docs/BUILDING.md)**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "cargo not found" | Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Port 1420 already in use | `lsof -ti:1420 \| xargs kill -9` |
| Server not responding | Check logs for "listening at", verify port 3000 available |
| TypeScript errors | Run `npm run build` to see all errors |
| Module not found | `rm -rf node_modules src-tauri/target && npm install` |

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#troubleshooting) for more troubleshooting.

## Project Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- No unused locals or parameters
- Imports must be explicit (no namespace imports)

### Testing

- **Frontend**: Vitest + React Testing Library
  - Location: `test/frontend/**/*.test.{ts,tsx}`
  - Query by accessibility (role/text), not ID/class
  - Use `userEvent` for realistic interactions
  - Mock `fetch` for API calls
  - Run: `npm run test:frontend`

- **Server**: node:test + Fastify `inject()`
  - Location: `test/server/**/*.test.ts`
  - Test all HTTP methods and error cases
  - Use `buildApp()` helper from `test/server/helper.ts`
  - Validate response shape and status
  - Run: `npm run test:server`

- **Rust**: Inline `#[cfg(test)]` modules
  - Location: Same file as code being tested
  - Test edge cases and boundary conditions
  - Run: `npm run test:rust`

- **All tests**: `npm test` (frontend + server)
- See **[docs/TESTING.md](docs/TESTING.md)** for detailed guide

### Logging

- Use `logger.info()` for important events
- Use `logger.debug()` for detailed tracing
- Never log passwords, tokens, or secrets
- Include context in logs: `logger.info({ userId, action }, 'message')`

### API Routes

- Auto-loaded from `server/src/routes/`
- Use TypeScript for type safety
- Validate all input
- Return consistent JSON responses
- Write tests in `test/server/routes/<route-name>.test.ts`

### Rust

- Use `log::info!()`, `log::debug!()` for logging
- Handle errors gracefully
- Document complex logic
- Write tests in `#[cfg(test)]` module at end of file

## Key Decisions

✅ **HTTP-based communication** → Simple, universal, webview-compatible
✅ **Fastify sidecar** → Rich Node.js ecosystem, fast to develop
✅ **Tauri v2** → Modern, lightweight, cross-platform
✅ **TypeScript everywhere** → Type safety across frontend and server
✅ **Structured logging** → Observability from day one
✅ **Unified test suite** → Vitest (frontend) + node:test (server) + Cargo (Rust) with 27+ tests

## Getting Help

1. **Check the docs** → Browse `docs/` directory
2. **Check logs** → Run with `RUST_LOG=debug npm run tauri dev`
3. **Check source code** → Well-commented, self-documenting
4. **TypeScript errors** → Run `npm run build` to see all type errors at once
