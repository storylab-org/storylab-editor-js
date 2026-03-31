# Architecture

## Overview

Storylab is a **desktop application** built with Tauri v2, React, TypeScript, and Fastify. It combines a native Rust backend with a Node.js sidecar server for business logic.

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend (TypeScript + Vite)                     │
│  - Runs in Tauri webview                                │
│  - Port 1420 (dev), custom protocol (production)        │
│  - HTTP client for server communication                 │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP (localhost:3000)
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Fastify Server Sidecar (Node.js + TypeScript)          │
│  - Spawned by Tauri on app startup                      │
│  - Port 3000                                             │
│  - Business logic, API routes, data processing          │
│  - Pino logging                                          │
└─────────────────────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Tauri Runtime (Rust)                                   │
│  - Manages app lifecycle                                │
│  - Spawns and monitors Node.js sidecar                  │
│  - Handles desktop-specific features (OS integration)   │
│  - Bundling, security, native APIs                      │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Frontend → Server (HTTP)

```typescript
// Frontend makes HTTP requests to the Fastify server
const response = await fetch("http://localhost:3000/greet?name=Alice");
const data = await response.json();
```

### Rust Backend ↔ Frontend

The Rust backend doesn't directly communicate with the frontend. It manages the sidecar lifecycle and can spawn additional processes if needed. Desktop-specific features (file system, OS APIs) can be exposed via Tauri commands if required.

### Server Lifecycle

1. **App Starts** → Tauri runtime initializes
2. **Setup Phase** → `spawn_server()` launches Node.js process at `./server/dist/server.js`
3. **Running** → Node.js listens on port 3000, Vite dev server on port 1420
4. **App Closes** → Node.js process is terminated

## Project Structure

```
storylab/
├── src/                          # React frontend
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   ├── logger.ts                # Browser logging utility
│   └── App.css
├── server/                      # Fastify sidecar
│   ├── src/
│   │   ├── server.ts           # Entry point (starts Fastify)
│   │   ├── app.ts              # Fastify plugin with autoload
│   │   ├── routes/             # Auto-loaded route files
│   │   │   ├── root.ts         # GET /
│   │   │   ├── greet.ts        # GET /greet
│   │   │   └── status.ts       # GET /status
│   │   └── plugins/            # Auto-loaded middleware
│   │       ├── logger.ts       # Request/response logging
│   │       └── sensible.ts     # Security headers
│   ├── dist/                   # Compiled JavaScript
│   └── package.json
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs            # Entry point (minimal)
│   │   └── lib.rs             # App initialization, sidecar spawning
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri configuration
├── docs/                       # Documentation
├── CLAUDE.md                   # Developer guide
└── package.json
```

## Key Design Decisions

### ✅ HTTP-Based Communication

**Why:** Simple, universally supported, works across boundaries (webview ↔ sidecar)

- Frontend uses `fetch()` to call server
- No IPC complexity or browser compatibility issues
- Server is reachable from both desktop app and browser (during development)

### ✅ Node.js Sidecar for Business Logic

**Why:** TypeScript, rich ecosystem, fast to develop

- Fastify for high-performance HTTP server
- Middleware ecosystem (CORS, logging, auth)
- Easy to test and iterate on

### ✅ Rust for Desktop Integration

**Why:** Performance, security, OS-level access

- Tauri v2 handles security and bundling
- Spawn processes (sidecar)
- Future: native file system access, system integration

### ✅ Separation of Concerns

- **Frontend** = UI/UX logic
- **Server** = Business logic, API, data processing
- **Rust** = Desktop-specific features, lifecycle management

### ✅ Platform-Aware Features

Some features behave differently on web vs desktop:

**Example: Export functionality**
- **Web:** Browser download dialog (standard `<a>` download)
- **Tauri:** Native file save dialog (via `@tauri-apps/plugin-dialog`)
- Implementation: Runtime detection in `src/api/export.ts`, platform-specific code paths

See **[docs/SIDEBAR_MENU.md](SIDEBAR_MENU.md)** for export implementation details.

## Development vs Production

### Development
- Vite dev server on port 1420 with hot reload
- Fastify on port 3000 with file watching
- Rust backend recompiles on changes
- Browser console + Pino logs visible

### Production
- Frontend bundled into app assets
- Server compiled and bundled into app resources
- Single executable (macOS: `.dmg`, Windows: `.msi`/`.exe`)
- Logging sent to system logs or files

## Extensibility

### Adding Features

1. **New API Route** → Create file in `server/src/routes/`
2. **New Middleware** → Create file in `server/src/plugins/`
3. **Desktop Feature** → Add command to `src-tauri/src/lib.rs`
4. **UI Component** → Create in `src/` (React as usual)

All route and plugin files are auto-loaded via `@fastify/autoload`.
