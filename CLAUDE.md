# Hello MCP App - Project Guidelines

## Package Manager

**This project uses pnpm exclusively.**

- ✅ Use `pnpm install` (not npm install)
- ✅ Use `pnpm add <package>` (not npm install <package>)
- ✅ Use `pnpm <script>` (not npm run <script>)
- ❌ Never use npm or yarn commands

## Project Structure

```
hello-mcp-app/
├── src/
│   ├── core/              # Cloud-agnostic MCP server core
│   │   ├── greetings.ts   # Multilingual greeting data (15 languages)
│   │   └── create-server.ts  # MCP server factory
│   ├── entry/             # Platform-specific entry points
│   │   ├── stdio.ts       # Local testing via stdio transport
│   │   └── node-http.ts   # Express + Streamable HTTP (Docker/Cloud)
│   └── ui/                # iPhone-style welcome screen
│       ├── mcp-app.html   # Main UI structure
│       ├── mcp-app.ts     # MCP App SDK client
│       └── styles.css     # Fade-cycling animations
├── dist/                  # Build output (generated)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # Client type checking (noEmit, bundler resolution)
├── tsconfig.server.json   # Server declarations (NodeNext, emitDeclarationOnly)
├── vite.config.ts         # Vite bundler configuration
├── Dockerfile             # Node.js deployment (uses pnpm)
└── .npmrc                 # pnpm configuration
```

## Development Workflow

### Initial Setup
```bash
pnpm install
```

### Development Commands
```bash
# Quick start with interactive menu
./startup.sh

# Dev server with concurrent Vite watch + tsx watch (port 3000)
pnpm start

# Full build (type-check → declarations → UI bundle)
pnpm build

# Build and run stdio transport
pnpm start:stdio

# Production server (requires pnpm build first)
pnpm start:prod
```

### Build Pipeline (Dual tsconfig Strategy)
```
pnpm build = tsc --noEmit          → type-check all src/**/*
           + tsc -p tsconfig.server → emit .d.ts for core + entry
           + vite build             → bundle UI into single HTML
```

- `tsconfig.json` — type checking only (`noEmit`, `moduleResolution: bundler`, includes DOM types)
- `tsconfig.server.json` — server JS + declarations (`NodeNext`, emits to `dist/`)
- Vite handles UI bundling into single HTML; `emptyOutDir: false` preserves tsc output

### Deployment Commands
```bash
# Build Docker image
docker build -t hello-mcp .

# Run Docker container
docker run -p 3000:3000 hello-mcp
```

## Architecture Principles

### Cloud-Agnostic Core
- `src/core/` contains the MCP server factory and greeting data
- Uses `import.meta.dirname` for HTML path resolution (works in both compiled and tsx modes)
- Can be imported by any entry point (stdio, HTTP)

### Stateless Per-Request Architecture
All HTTP entry points use **stateless mode**: a fresh `McpServer` + transport is created per request.
- No shared server instance across requests
- Compatible with serverless environments (Lambda, etc.)
- Compatible with ChatGPT's connection model (no long-lived sessions)

### Multiple Entry Points
- **stdio**: Local testing with MCP Inspector (single server instance, stateful)
- **node-http**: Docker, Cloud Run, AWS, VPS — uses `StreamableHTTPServerTransport` (stateless, per-request)

### Single-File UI Bundle
- Vite bundles `src/ui/mcp-app.html` into `dist/src/ui/mcp-app.html`
- All CSS, JS, and assets inlined for easy deployment
- Served as MCP resource via `registerAppResource`

## Code Style

### TypeScript
- ES modules (`type: "module"` in package.json)
- Strict mode enabled
- Target: ES2022, Node 18+

### Imports
- Use `.js` extensions in imports (ES modules requirement)
- Example: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"`

### File Naming
- kebab-case for files: `create-server.ts`, `node-http.ts`
- PascalCase for types/interfaces
- camelCase for variables/functions

## Testing

### Local Testing (stdio)
```bash
pnpm start:stdio
# Connect via MCP Inspector or Claude Desktop
```

### HTTP Server Testing
```bash
pnpm start
# Test endpoint: http://localhost:3000/mcp
# Health check: http://localhost:3000/health
```

### Docker Testing
```bash
docker build -t hello-mcp .
docker run -p 3000:3000 hello-mcp
curl http://localhost:3000/health
```

## Deployment Methods

This app supports 3 deployment methods across 2 entry points:

| Method | Entry Point | Transport | Mode | Best For |
|--------|-------------|-----------|------|----------|
| Claude Desktop (stdio) | `stdio.ts` | stdio | Stateful | Local development & testing |
| Node.js HTTP | `node-http.ts` | Streamable HTTP | Stateless | VPS, Cloud VM, local HTTP |
| Docker | `node-http.ts` | Streamable HTTP | Stateless | Cloud Run, AWS ECS, containers |

### 1. Claude Desktop (Local stdio)

Runs as a local child process managed by Claude Desktop. No network required.

```bash
pnpm build
ls dist/entry/stdio.js
```

Edit Claude Desktop config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hello-world": {
      "command": "node",
      "args": ["/Users/lukechimbp2023/Documents_local/idea/mcp-apps/hello-mcp-app/dist/entry/stdio.js"]
    }
  }
}
```

**Note:** Use `node` with the absolute path to the compiled JS. Run `pnpm build` first.

### 2. Node.js HTTP Server

Express v5 server with Streamable HTTP transport. Suitable for VPS, Cloud VM, or local testing.

```bash
# Development (concurrent Vite watch + tsx watch)
pnpm start

# Production
pnpm build
pnpm start:prod
```

**Endpoints:**
- MCP: `http://localhost:3000/mcp`
- Health: `http://localhost:3000/health`

**Environment variables:** `PORT` (default: `3000`)

**Verify:**
```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

### 3. Docker

Multi-stage build with Node.js 22 Alpine.

```bash
docker build -t hello-mcp .
docker run -p 3000:3000 hello-mcp
curl http://localhost:3000/health
```

**Deploy to cloud container platforms:**
```bash
# Google Cloud Run
gcloud run deploy hello-mcp --source . --port 3000 --allow-unauthenticated

# AWS App Runner (via ECR)
docker tag hello-mcp:latest <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest

# Railway
railway up

# Fly.io
fly launch && fly deploy
```

### ngrok Tunnel (for Development)

Expose local HTTP server via HTTPS for testing with ChatGPT (which requires HTTPS).

```bash
# Terminal 1: Start local server
pnpm start

# Terminal 2: Expose via ngrok
ngrok http 3000
```

Use the ngrok HTTPS URL (e.g. `https://abc123.ngrok-free.app/mcp`) as MCP connector URL.

## Connecting to AI Clients

### Claude Desktop (Remote)
1. Deploy to any HTTPS endpoint
2. Settings > Developer > Edit Config
3. Add URL: `https://your-server.com/mcp`

### Claude Web (Remote MCP Connect)
1. Deploy to any HTTPS endpoint
2. Settings > Connectors > Add URL
3. Enter: `https://your-server.com/mcp`

### ChatGPT (MCP Apps UI Supported)
ChatGPT 透過 OpenAI Apps SDK 實作了 MCP Apps UI 標準，支援在聊天視窗中渲染互動式 UI（sandboxed iframe）。

**連接步驟：**
1. Deploy to HTTPS (Cloud Run, ngrok, etc.)
2. Settings → Connectors → Advanced → Enable Developer Mode
3. Add MCP connector with your URL

**Supported:** SSE, Streamable HTTP | **Auth:** OAuth, No Auth
**Limitation:** No local MCP servers (must be HTTPS), Tool count < 70 recommended

**MCP Apps UI 運作機制：**
- `registerAppResource` 註冊 HTML bundle 為 `ui://` 資源（MIME: `text/html;profile=mcp-app`）
- Tool 的 `_meta.ui.resourceUri` 指向 UI 資源
- ChatGPT 在 sandboxed iframe 中渲染，透過 JSON-RPC over postMessage 雙向通訊
- 同一個 MCP Server 可同時支援 Claude、ChatGPT、VS Code、Goose 的 UI 渲染

**參考資源：**
- [OpenAI Apps SDK Quickstart](https://developers.openai.com/apps-sdk/quickstart/)
- [OpenAI Apps SDK - Build MCP Server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [MCP Apps 官方 Blog](http://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)

### VS Code (Insiders)
1. Deploy to any HTTPS endpoint, or use local stdio
2. Configure in VS Code MCP settings

### Goose
1. Deploy to any HTTPS endpoint
2. Add MCP server URL in Goose settings

## Common Tasks

### Adding a New Language
1. Edit `src/core/greetings.ts`
2. Add new entry to `GREETINGS` array
3. Rebuild: `pnpm build`

### Modifying UI Animation
1. Edit `src/ui/styles.css` (animation timing)
2. Edit `src/ui/mcp-app.ts` (greeting logic)
3. Rebuild: `pnpm build` (or use `pnpm start` for live reload)

### Adding New Dependencies
```bash
# Production dependency
pnpm add <package>

# Development dependency
pnpm add -D <package>
```

## Troubleshooting

### "Cannot find module" errors
- Ensure imports use `.js` extensions
- Run `pnpm install` to verify dependencies
- Check `tsconfig.server.json` for server module resolution

### UI not updating
- Run `pnpm build` to rebuild
- Check `dist/src/ui/mcp-app.html` exists
- Restart the server

### Docker build fails
- Ensure pnpm-lock.yaml exists: `pnpm install`
- Check Dockerfile uses pnpm (not npm)
- Verify .npmrc is copied into container

### Port 3000 already in use
- Change port in `src/entry/node-http.ts`
- Update Dockerfile EXPOSE instruction
- Update docker run command: `-p 3001:3001`

## Lessons Learned

### Dependency Version Management
**Critical Finding**: Using `"latest"` for MCP SDK packages can cause version conflicts.

**Lesson**: For mission-critical dependencies (especially SDK packages), pin exact versions to ensure reproducible builds and type compatibility.

### Multi-Entry Point Architecture
**Success Pattern**: Cloud-agnostic core with platform-specific adapters.

**Benefits:**
- Single codebase for all deployment modes
- Easy testing (stdio) before production deployment
- Platform flexibility (Docker, serverless)
- Clean separation of concerns

**Key Pattern:**
```typescript
// Core (self-contained, reads HTML via import.meta.dirname)
export function createServer(): McpServer { ... }

// Entry points (thin adapters)
// stdio.ts - createServer() + StdioServerTransport
// node-http.ts - createServer() + StreamableHTTPServerTransport
```

### pnpm Migration Success
**Benefits Realized:**
- Faster installation (21s vs ~40s with npm)
- Disk space savings (hard links)
- Strict dependency resolution
- Built-in workspace support

**Key Files:**
- `.npmrc` - pnpm configuration
- `package.json` - packageManager field
- `Dockerfile` - pnpm-specific build process

### MCP Apps UI Lifecycle
**Reference**: [SKILL.md](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md)

**Core Concept**: Tool + Resource linked by `_meta.ui.resourceUri`
```
Host calls tool → Server returns result → Host renders resource UI → UI receives result
```

**Client-Side Event Handlers** (register ALL before `app.connect()`):
| Handler | Purpose |
|---------|---------|
| `ontoolinput` | Receive tool input arguments |
| `ontoolresult` | Receive tool execution result |
| `ontoolinputpartial` | Streaming progressive rendering (healed partial JSON) |
| `onhostcontextchanged` | Theme, display mode, safe area insets |
| `onteardown` | Cleanup resources before teardown |

**Client-Side Actions**:
| Method | Purpose |
|--------|---------|
| `app.callServerTool()` | UI initiates server tool call (bidirectional) |
| `app.updateModelContext()` | Notify model of UI state changes |
| `app.sendMessage()` | Background push message to model |
| `app.sendLog()` | Debug logging to host |
| `app.requestDisplayMode()` | Toggle fullscreen |

**Host Styling** (via `onhostcontextchanged`):
- `applyDocumentTheme(ctx.theme)` — dark/light mode
- `applyHostStyleVariables(ctx.styles.variables)` — CSS variables (`--color-*`, `--font-*`, `--border-radius-*`)
- `applyHostFonts(ctx.styles.css.fonts)` — host font families
- `ctx.safeAreaInsets` — `{ top, right, bottom, left }` padding

**Tool Visibility**:
```typescript
visibility: ["model", "app"]  // Default: both can access
visibility: ["app"]           // UI-only (hidden from model)
visibility: ["model"]         // Model-only (app cannot call)
```

**Visibility Gotcha — `callServerTool` and `visibility: ["app"]`**:
Tools with `visibility: ["app"]` are excluded from the server's `tools/list` response.
When the UI calls `app.callServerTool()`, it goes through the MCP protocol which checks
`tools/list` first — so `visibility: ["app"]` tools will fail with `-32602: Tool not found`.

**Workaround**: If a tool needs to be callable from the UI via `callServerTool()`, do NOT
restrict visibility to `["app"]` only. Use the default (no visibility field) so it appears
in `tools/list` and is accessible to both model and app.

**Performance**: Use `IntersectionObserver` to pause animations/polling when UI scrolls off-screen.

### Transport Protocol Evolution
**SSE (legacy)** → **Streamable HTTP (current recommended)**

Streamable HTTP uses stateless per-request server creation, which is more compatible with ChatGPT and serverless environments:
```typescript
// Stateless: new server per request
app.all("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP App SDK](https://github.com/modelcontextprotocol/ext-apps)
- [MCP Apps SKILL.md](https://github.com/modelcontextprotocol/ext-apps/blob/main/plugins/mcp-apps/skills/create-mcp-app/SKILL.md)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/quickstart/)
- [pnpm Documentation](https://pnpm.io/)
