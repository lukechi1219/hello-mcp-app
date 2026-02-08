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
│   │   ├── node-http.ts   # Express + Streamable HTTP (Docker/Cloud)
│   │   └── cloudflare-worker.ts  # Cloudflare Workers deployment
│   └── ui/                # iPhone-style welcome screen
│       ├── mcp-app.html   # Main UI structure
│       ├── mcp-app.ts     # MCP App SDK client
│       └── styles.css     # Fade-cycling animations
├── dist/                  # Build output (generated)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite bundler configuration
├── Dockerfile             # Node.js deployment (uses pnpm)
├── wrangler.toml          # Cloudflare Workers config
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

# Build UI bundle
pnpm build:ui

# Embed full HTML into Cloudflare Worker
pnpm embed:html

# Test locally via stdio transport
pnpm dev

# Test HTTP server (port 3000)
pnpm dev:http

# Full build (UI + TypeScript compilation for stdio/HTTP)
pnpm build

# Build Cloudflare Worker (UI + embed HTML)
pnpm build:cf

# Start production server
pnpm start
```

### Deployment Commands
```bash
# Deploy to Cloudflare Workers (builds UI + embeds HTML + deploys)
pnpm deploy:cf

# Build Docker image
docker build -t hello-mcp .

# Run Docker container
docker run -p 3000:3000 hello-mcp
```

### HTML Embedding for Cloudflare Workers

Cloudflare Workers cannot read files from disk at runtime, so the HTML must be embedded in the source code.

**Process:**
1. `pnpm build:ui` - Build the UI bundle (366KB single-file HTML)
2. `pnpm embed:html` - Run `scripts/embed-html.js` to embed HTML into `cloudflare-worker.ts`
3. The script properly escapes the HTML for TypeScript template literals

**Note:** The `cloudflare-worker.ts` file is excluded from regular `tsc` builds because it's 363KB and only needed for Cloudflare deployment. Wrangler builds it separately.

## Architecture Principles

### Cloud-Agnostic Core
- `src/core/` contains no platform-specific code
- No direct filesystem, network, or runtime dependencies
- Can be imported by any entry point (stdio, HTTP, Workers)

### Stateless Per-Request Architecture
All HTTP entry points use **stateless mode**: a fresh `McpServer` + transport is created per request.
- No shared server instance across requests
- Compatible with serverless environments (Cloudflare Workers, Lambda)
- Compatible with ChatGPT's connection model (no long-lived sessions)

### Multiple Entry Points
- **stdio**: Local testing with MCP Inspector (single server instance, stateful)
- **node-http**: Docker, Cloud Run, AWS, VPS — uses `StreamableHTTPServerTransport` (stateless, per-request)
- **cloudflare-worker**: Serverless edge — uses `WorkerTransport` (stateless, per-request)

### Cloudflare Workers is Stateless
Cloudflare Workers 是 stateless 架構。每次 request 都是獨立的，沒有跨 request 的記憶體共享。
- V8 isolate 可能被複用，但不應依賴跨 request 的狀態
- 不能使用 `fs.readFile`，HTML 必須 embed 進原始碼
- 不適合 SSE 長連線，適合 Streamable HTTP stateless 模式
- 使用 `WorkerTransport` + per-request `createServer()` 確保真正的 stateless
- **避免使用** `createMcpHandler` 搭配單一 server 實例（它內部只連線一次，會共用 transport）

### Single-File UI Bundle
- Vite bundles `src/ui/mcp-app.html` into `dist/mcp-app.html`
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
pnpm dev
# Connect via MCP Inspector or Claude Desktop
```

### HTTP Server Testing
```bash
pnpm dev:http
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

This app supports 5 deployment methods across 3 entry points:

| Method | Entry Point | Transport | Mode | Best For |
|--------|-------------|-----------|------|----------|
| Claude Desktop (stdio) | `stdio.ts` | stdio | Stateful | Local development & testing |
| Node.js HTTP | `node-http.ts` | Streamable HTTP | Stateless | VPS, Cloud VM, local HTTP |
| Docker | `node-http.ts` | Streamable HTTP | Stateless | Cloud Run, AWS ECS, containers |
| Cloudflare Workers | `cloudflare-worker.ts` | WorkerTransport | Stateless | Serverless edge deployment |
| ngrok tunnel | `node-http.ts` | Streamable HTTP | Stateless | Expose local for ChatGPT testing |

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
# Development (auto-builds UI)
pnpm dev:http

# Production
pnpm build
pnpm start
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

### 4. Cloudflare Workers

Serverless edge deployment. HTML is embedded into the worker source at build time.

**Prerequisites:** Cloudflare account, `wrangler` CLI authenticated (`wrangler login`)

```bash
wrangler login        # First time only
pnpm deploy:cf        # Build UI → embed HTML → deploy
```

**What happens during `pnpm deploy:cf`:**
1. `pnpm build:ui` — Vite builds single-file HTML bundle (~370KB)
2. `pnpm embed:html` — Embeds HTML into `cloudflare-worker.ts`
3. `wrangler deploy` — Compiles and deploys to Cloudflare edge

**Output URL:** `https://hello-mcp-app.<your-subdomain>.workers.dev/mcp`

### 5. ngrok Tunnel (for Development)

Expose local HTTP server via HTTPS for testing with ChatGPT (which requires HTTPS).

```bash
# Terminal 1: Start local server
pnpm dev:http

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
1. Deploy to HTTPS (Cloudflare Workers, Cloud Run, ngrok, etc.)
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
3. Rebuild UI: `pnpm build:ui`

### Modifying UI Animation
1. Edit `src/ui/styles.css` (animation timing)
2. Edit `src/ui/mcp-app.ts` (greeting logic)
3. Rebuild: `pnpm build:ui`

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
- Check `tsconfig.json` paths configuration

### UI not updating
- Run `pnpm build:ui` to rebuild
- Check `dist/mcp-app.html` exists
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

**What Happened:**
- `agents@0.3.10` depends on `@modelcontextprotocol/sdk@1.25.2`
- Using `"latest"` installed SDK 1.26.0
- TypeScript detected incompatible `McpServer` types between versions
- Blocked Cloudflare Workers deployment

**Solution:**
Pin all MCP-related packages to compatible versions:
```json
{
  "@modelcontextprotocol/sdk": "1.25.2",
  "@modelcontextprotocol/ext-apps": "^1.0.1",
  "agents": "^0.3.10"
}
```

**Lesson**: For mission-critical dependencies (especially SDK packages), pin exact versions to ensure reproducible builds and type compatibility.

### Cloudflare Workers HTML Embedding
**Challenge**: Cloudflare Workers can't read files from disk at runtime.

**Solutions Explored:**
1. **Inline Placeholder** (Development): Simple HTML string for testing
2. **Full Bundle Embedding** (Production): Embed entire built HTML
3. **Build-time Generation** (Best): Generate worker during build process

**Current Approach**: Embed built HTML directly in source for production deployment.

### Multi-Entry Point Architecture
**Success Pattern**: Cloud-agnostic core with platform-specific adapters.

**Benefits:**
- Single codebase for all deployment modes
- Easy testing (stdio) before production deployment
- Platform flexibility (Docker, Cloudflare, serverless)
- Clean separation of concerns

**Key Pattern:**
```typescript
// Core (platform-agnostic)
export function createServer(options: { htmlLoader: () => string }) { ... }

// Adapters (platform-specific)
// stdio.ts - reads from disk
// node-http.ts - reads from disk
// cloudflare-worker.ts - uses embedded string
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
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
