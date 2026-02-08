# Hello MCP App

Multilingual "Hello World" MCP App with iPhone-style fade animations. Built with the [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps), it renders interactive UI directly inside AI clients like Claude, ChatGPT, VS Code, and Goose.

## Features

- 15 languages with smooth fade-cycling animations
- Interactive UI rendered in sandboxed iframe via MCP Apps protocol
- Host theme integration (dark/light mode, CSS variables, fonts)
- Fullscreen toggle and refresh button with bidirectional tool calls
- Stateless per-request architecture for serverless compatibility

## Quick Start

```bash
pnpm install
pnpm build
```

## Deployment Methods

This app supports 5 deployment methods across 3 entry points:

| Method | Entry Point | Transport | Mode | Best For |
|--------|-------------|-----------|------|----------|
| [Claude Desktop (stdio)](#1-claude-desktop-local-stdio) | `stdio.ts` | stdio | Stateful | Local development & testing |
| [Node.js HTTP](#2-nodejs-http-server) | `node-http.ts` | Streamable HTTP | Stateless | VPS, Cloud VM, local HTTP |
| [Docker](#3-docker) | `node-http.ts` | Streamable HTTP | Stateless | Cloud Run, AWS ECS, any container platform |
| [Cloudflare Workers](#4-cloudflare-workers) | `cloudflare-worker.ts` | WorkerTransport | Stateless | Serverless edge deployment |
| [ngrok tunnel](#5-ngrok-tunnel-for-development) | `node-http.ts` | Streamable HTTP | Stateless | Expose local server for ChatGPT testing |

### 1. Claude Desktop (Local stdio)

Runs as a local child process managed by Claude Desktop. No network required.

**Steps:**

```bash
# 1. Build the project
pnpm build

# 2. Verify the output exists
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
      "args": ["/absolute/path/to/hello-mcp-app/dist/entry/stdio.js"]
    }
  }
}
```

```bash
# 3. Restart Claude Desktop
# 4. In conversation, type: "Use the hello-world tool"
```

### 2. Node.js HTTP Server

Runs an Express v5 server with Streamable HTTP transport. Suitable for VPS, Cloud VM, or local testing.

**Steps:**

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

**Environment variables:**
- `PORT` — Server port (default: `3000`)

**Verify:**

```bash
# Health check
curl http://localhost:3000/health

# MCP initialize test
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

### 3. Docker

Multi-stage build with Node.js 22 Alpine. Production-ready container.

**Steps:**

```bash
# 1. Build Docker image
docker build -t hello-mcp .

# 2. Run container
docker run -p 3000:3000 hello-mcp

# 3. Verify
curl http://localhost:3000/health
```

**Custom port:**

```bash
docker run -p 8080:3000 -e PORT=3000 hello-mcp
```

**Deploy to cloud container platforms:**

```bash
# Google Cloud Run
gcloud run deploy hello-mcp \
  --source . \
  --port 3000 \
  --allow-unauthenticated

# AWS App Runner (via ECR)
docker tag hello-mcp:latest <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/hello-mcp:latest

# Railway
railway up

# Fly.io
fly launch
fly deploy
```

**MCP endpoint after deploy:** `https://your-service-url.com/mcp`

### 4. Cloudflare Workers

Serverless edge deployment. HTML is embedded into the worker source at build time.

**Prerequisites:**
- Cloudflare account
- `wrangler` CLI authenticated (`wrangler login`)

**Steps:**

```bash
# 1. Login to Cloudflare (first time only)
wrangler login

# 2. Build and deploy (builds UI → embeds HTML → deploys)
pnpm deploy:cf
```

**What happens during `pnpm deploy:cf`:**
1. `pnpm build:ui` — Vite builds single-file HTML bundle (~370KB)
2. `pnpm embed:html` — `scripts/embed-html.js` embeds HTML into `cloudflare-worker.ts`
3. `wrangler deploy` — Wrangler compiles and deploys to Cloudflare edge

**Output URL:** `https://hello-mcp-app.<your-subdomain>.workers.dev/mcp`

**Custom domain (optional):**

Edit `wrangler.toml`:
```toml
routes = [
  { pattern = "hello-mcp.example.com/*", zone_name = "example.com" }
]
```

### 5. ngrok Tunnel (for Development)

Expose your local HTTP server via HTTPS for testing with ChatGPT (which requires HTTPS).

**Steps:**

```bash
# Terminal 1: Start local server
pnpm dev:http

# Terminal 2: Expose via ngrok
ngrok http 3000
```

**Use the ngrok HTTPS URL** (e.g. `https://abc123.ngrok-free.app/mcp`) as MCP connector URL.

## Connecting to AI Clients

After deploying to an HTTPS endpoint, connect to any MCP-compatible client:

### Claude Desktop (Remote)

1. Deploy to any HTTPS endpoint
2. Settings > Developer > Edit Config
3. Add URL: `https://your-server.com/mcp`

### Claude Web (Remote MCP Connect)

1. Deploy to any HTTPS endpoint
2. Settings > Connectors > Add URL
3. Enter: `https://your-server.com/mcp`

### ChatGPT

Requires HTTPS endpoint. Supports MCP Apps UI rendering (same interactive UI as Claude).

1. Deploy to HTTPS (Cloudflare Workers, Cloud Run, ngrok, etc.)
2. Settings > Connectors > Advanced > Enable Developer Mode
3. Add MCP connector with your URL
4. In conversation, ask to use the tool

**Supported:** SSE, Streamable HTTP | **Auth:** OAuth, No Auth
**Limitation:** No local MCP servers (must be HTTPS)

### VS Code (Insiders)

1. Deploy to any HTTPS endpoint, or use local stdio
2. Configure in VS Code MCP settings

### Goose

1. Deploy to any HTTPS endpoint
2. Add MCP server URL in Goose settings

## Architecture

```
hello-mcp-app/
├── src/
│   ├── core/                # Cloud-agnostic MCP server core
│   │   ├── greetings.ts     # Multilingual greeting data (15 languages)
│   │   └── create-server.ts # MCP server factory (tools + resources)
│   ├── entry/               # Platform-specific entry points
│   │   ├── stdio.ts         # Local testing (stateful)
│   │   ├── node-http.ts     # Express v5 + Streamable HTTP (stateless)
│   │   └── cloudflare-worker.ts  # Cloudflare Workers (stateless)
│   └── ui/                  # iPhone-style welcome screen
│       ├── mcp-app.html     # Main UI structure
│       ├── mcp-app.ts       # MCP App SDK client (full lifecycle)
│       └── styles.css       # Animations + host theme fallbacks
├── Dockerfile               # Multi-stage Node.js build
├── wrangler.toml            # Cloudflare Workers config
└── package.json             # pnpm scripts & dependencies
```

All HTTP entry points use **stateless per-request** architecture: a fresh `McpServer` + transport is created per request, compatible with serverless environments.

## MCP Apps Lifecycle

The UI client implements the full MCP Apps event lifecycle:

| Handler | Purpose |
|---------|---------|
| `ontoolinput` | Receive tool input arguments |
| `ontoolresult` | Receive tool execution result, update greetings |
| `onhostcontextchanged` | Apply host theme, fonts, safe area insets |
| `onteardown` | Clean up animation timers |

| Action | Purpose |
|--------|---------|
| `callServerTool()` | Refresh greetings from server |
| `requestDisplayMode()` | Toggle fullscreen |
| `sendLog()` | Debug logging to host |

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Test locally via stdio
pnpm dev:http         # Test HTTP server (port 3000)
pnpm build            # Full build (UI + TypeScript)
pnpm build:ui         # Build UI bundle only
pnpm build:cf         # Build for Cloudflare Workers
pnpm start            # Start production HTTP server
pnpm deploy:cf        # Deploy to Cloudflare Workers
pnpm embed:html       # Embed HTML into cloudflare-worker.ts
```

## Tech Stack

- **Runtime**: Node.js 18+, Cloudflare Workers
- **Language**: TypeScript (ES2022, strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`
- **Transport**: Streamable HTTP (Node.js), WorkerTransport (Cloudflare)
- **Server**: Express v5 with `createMcpExpressApp`
- **Build**: Vite + `vite-plugin-singlefile` (single-file HTML bundle)
- **Package Manager**: pnpm

## License

MIT
