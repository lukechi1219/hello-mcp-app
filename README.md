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

## Connect to Claude Desktop

Two options — **local stdio** or **remote HTTP**.

### Option 1: Local via stdio

Best for development and testing. Runs as a local process managed by Claude Desktop.

```bash
pnpm build
```

Edit Claude Desktop config file:

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

Restart Claude Desktop. Then type: **"Use the hello-world tool"**

### Option 2: Remote via HTTP

Best for sharing or deploying. Uses Streamable HTTP transport (stateless).

```bash
pnpm dev:http
```

Server starts at `http://localhost:3000/mcp`.

In Claude Desktop:
1. Settings > Developer > Edit Config
2. Add your MCP server URL as a connector

### Option 3: Cloudflare Workers

Deploy to the edge for public access:

```bash
pnpm deploy:cf
```

Use the generated URL (e.g. `https://hello-mcp-app.your-subdomain.workers.dev/mcp`) in any MCP client.

## Connect to ChatGPT

1. Deploy to an HTTPS endpoint (Cloudflare Workers, Cloud Run, etc.)
2. In ChatGPT: Settings > Connectors > Advanced > Enable Developer Mode
3. Add MCP connector with your HTTPS URL

ChatGPT supports MCP Apps UI rendering — the same interactive UI works across both Claude and ChatGPT.

## Architecture

```
hello-mcp-app/
├── src/
│   ├── core/                # Cloud-agnostic MCP server core
│   │   ├── greetings.ts     # Multilingual greeting data (15 languages)
│   │   └── create-server.ts # MCP server factory (tools + resources)
│   ├── entry/               # Platform-specific entry points
│   │   ├── stdio.ts         # Local testing (stateful)
│   │   ├── node-http.ts     # Express + Streamable HTTP (stateless)
│   │   └── cloudflare-worker.ts  # Cloudflare Workers (stateless)
│   └── ui/                  # iPhone-style welcome screen
│       ├── mcp-app.html     # Main UI structure
│       ├── mcp-app.ts       # MCP App SDK client (full lifecycle)
│       └── styles.css       # Animations + host theme fallbacks
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
pnpm build:cf         # Build for Cloudflare Workers
pnpm deploy:cf        # Deploy to Cloudflare Workers
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
