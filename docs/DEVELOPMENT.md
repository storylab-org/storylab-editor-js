# Development Guide

## Prerequisites

- **Node.js** v18+ (via nvm recommended)
- **Rust** 1.70+ (install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **macOS Command Line Tools** (or equivalents on Linux/Windows)

Verify setup:
```bash
node --version
rustc --version
cargo --version
```

## Quick Start

```bash
# Clone and navigate
cd /Users/yannik/js/storylab

# Install dependencies
npm install
npm install --prefix server

# Start development
npm run tauri dev
```

The app will open automatically with:
- React frontend on `http://localhost:1420` (with hot reload)
- Fastify server on `http://localhost:3000`
- Tauri window displaying the app

## Common Commands

### Root Directory (Frontend + Desktop)

```bash
# Start full dev environment
npm run tauri dev

# Build production binary
npm run build

# Lint TypeScript
npm run build  # TypeScript check is part of build

# Run tests (if configured)
npm run test
```

### Server Directory

```bash
cd server

# Rebuild TypeScript only
npm run build:ts

# Start server in dev mode (with file watching)
npm run dev

# Run tests
npm run test

# Start production server
npm run start
```

## Path Aliases

To avoid deep relative imports (`../../../`), use TypeScript path aliases configured in `tsconfig.json`:

### Quick Reference

| Alias | Points to | Example |
|-------|-----------|---------|
| `@/components/` | `src/components/` | `@/components/editor/LexicalEditor` |
| `@/api/` | `src/api/` | `@/api/documents` |
| `@/utils/` | `src/utils/` | `@/utils/logger` |
| `@/assets/` | `src/assets/` | `@/assets/icons` |
| `@/editor/` | `src/components/editor/` | `@/editor/LexicalEditor` |
| `@/editor/hooks/` | `src/components/editor/lexical/hooks/` | `@/editor/hooks/useModal` |
| `@/editor/nodes/` | `src/components/editor/lexical/nodes/` | `@/editor/nodes/ImageNode` |
| `@/editor/plugins/` | `src/components/editor/lexical/plugins/` | `@/editor/plugins/SlashCommandPlugin` |
| `@/editor/ui/` | `src/components/editor/lexical/ui/` | `@/editor/ui/DropDown` |
| `@/editor/utils/` | `src/components/editor/lexical/utils/` | `@/editor/utils/getSelectedNode` |
| `@/editor/themes/` | `src/components/editor/lexical/themes/` | `@/editor/themes/editorTheme` |
| `@/editor/commands/` | `src/components/editor/lexical/plugins/commands/` | `@/editor/commands/formatters` |

### Before (Hard to Read)
```typescript
import { useModal } from '../../hooks/useModal'
import { DropDown } from '../../ui/DropDown'
import { getSelectedNode } from '../../utils/getSelectedNode'
import { ImageNode } from '../nodes/ImageNode'
```

### After (Clear and Maintainable)
```typescript
import { useModal } from '@/editor/hooks/useModal'
import { DropDown } from '@/editor/ui/DropDown'
import { getSelectedNode } from '@/editor/utils/getSelectedNode'
import { ImageNode } from '@/editor/nodes/ImageNode'
```

**Use these aliases in all new code.** They make imports clearer, easier to refactor, and reduce cognitive load.

## Development Workflow

### 1. Frontend Changes

Edit files in `src/` → Vite hot reloads automatically in the Tauri window

### 2. Server Changes

Edit files in `server/src/` → TypeScript auto-compiles → Fastify auto-reloads → Refresh browser

If changes don't appear, restart the sidecar:
```bash
npm run tauri dev  # Restart entire environment
```

### 3. Rust Changes

Edit files in `src-tauri/src/` → Cargo auto-recompiles (visible in terminal) → App restarts

## Debugging

### Browser DevTools

In the Tauri window, press **F12** (or **Cmd+Opt+I** on macOS) to open DevTools.

View:
- Console (JavaScript errors, `console.log`)
- Network tab (HTTP requests to server)
- Application tab (local storage, etc.)

### Rust Backtrace

Run with:
```bash
RUST_BACKTRACE=1 npm run tauri dev
```

### Node.js Server Logs

Server logs are output directly to the terminal. Look for Fastify startup messages and request logs.

### Logging

All three layers have integrated logging:

- **Browser**: `logger.info()`, `logger.error()`, etc. (see browser console)
- **Server**: Pino logs (stdout with pretty formatting)
- **Rust**: env_logger logs (RUST_LOG=debug)

Start with debug logging:
```bash
RUST_LOG=debug npm run tauri dev
```

## Ports

- **1420** → Vite dev server (frontend)
- **1421** → Vite HMR (hot module reload)
- **3000** → Fastify server (backend)

If ports are in use, change them in:
- `vite.config.ts` (ports 1420/1421)
- `server/src/server.ts` (port 3000 via `PORT` env var)

## TypeScript

The project uses strict TypeScript:

```bash
# Check types without building
npx tsc --noEmit --project tsconfig.json
```

Strict settings (`tsconfig.json`):
- `strict: true` → All strict checks enabled
- `noUnusedLocals` → Unused variables cause errors
- `noUnusedParameters` → Unused parameters cause errors
- `noFallthroughCasesInSwitch` → Switch cases must return

## Adding Dependencies

### Frontend
```bash
npm install <package>
npm install --save-dev <package>  # for dev-only
```

### Server
```bash
cd server
npm install <package>
cd ..
```

### Rust
```bash
cd src-tauri
cargo add <crate>
cd ..
```

## Hot Reload

- **Frontend** → Automatic (Vite HMR)
- **Server** → TypeScript recompiles, but Fastify doesn't auto-restart (restart dev server)
- **Rust** → Automatic (Cargo watches src/)

## Testing

A comprehensive testing suite covers all three layers with **27+ tests** and **99%+ coverage**.

**Quick start:**
```bash
npm test                       # Run all tests
npm run test:frontend          # React + Vitest (17 tests)
npm run test:server            # Fastify + node:test (10 tests)
npm run test:rust              # Cargo tests (4 tests, requires Rust)
npm run test:frontend:watch    # Watch mode during development
npm run test:frontend:coverage # Coverage report
```

**Key test files:**
- Frontend: `test/frontend/logger.test.ts`, `test/frontend/App.test.tsx`
- Server: `test/server/routes/*.test.ts`, `test/server/plugins/*.test.ts`
- Rust: `src-tauri/src/lib.rs` (inline `#[cfg(test)]` module)

See **[TESTING.md](TESTING.md)** for comprehensive testing guide, patterns, and best practices.

## Performance Tips

1. **Use DevTools Network tab** to identify slow API calls
2. **Check server logs** for slow requests (timestamps in logs)
3. **Profile Rust code** with `cargo build --release`
4. **Monitor TypeScript compilation** time with `npm run build:ts`

## Troubleshooting

### "Port 1420 already in use"
```bash
# Kill process on port 1420
lsof -ti:1420 | xargs kill -9
npm run tauri dev
```

### "Cannot find module"
```bash
# Reinstall dependencies
rm -rf node_modules server/node_modules src-tauri/target
npm install
npm install --prefix server
npm run tauri dev
```

### "Rust compilation failed"
```bash
cd src-tauri
cargo clean
cargo build
```

### "Server not responding"
1. Check terminal for Fastify startup message
2. Verify port 3000 is available: `lsof -i:3000`
3. Check server logs for errors (search for "ERROR" in terminal output)

## Git Workflow

- Always work on feature branches
- Commit frequently with meaningful messages
- Test before pushing
- Use `npm run build` before committing to ensure no TypeScript errors

## Sharing Work

When sharing changes:
```bash
# Ensure everything compiles and tests pass
npm run build
cd server && npm run build:ts && cd ..
npm run tauri dev  # Manual test
```

Then commit and push.
