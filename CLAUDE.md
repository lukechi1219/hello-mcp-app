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

### Multiple Entry Points
- **stdio**: Local testing with MCP Inspector
- **node-http**: Docker, Cloud Run, AWS, VPS deployments
- **cloudflare-worker**: Serverless edge deployment

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

## Deployment Targets

### Claude Desktop (Local)
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "hello-world": {
      "command": "npx",
      "args": ["tsx", "src/entry/stdio.ts"],
      "cwd": "/path/to/hello-mcp-app"
    }
  }
}
```
**Note:** Use `npx` to invoke `tsx` since it's a local dev dependency, not globally installed.

### Claude Remote MCP Connect
1. Deploy to any HTTPS endpoint (Cloud Run, Railway, Fly.io, etc.)
2. Settings > Connectors > Add URL
3. Example: `https://hello-mcp.example.com/mcp`

### ChatGPT
1. Same HTTPS endpoint as Claude
2. Settings > Connectors > Advanced > Developer Mode
3. Add MCP connector with your URL

### Cloudflare Workers
```bash
pnpm deploy:cf
# Generates URL: https://hello-mcp-app.your-subdomain.workers.dev
```

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

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP App SDK](https://github.com/modelcontextprotocol/ext-apps)
- [pnpm Documentation](https://pnpm.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
