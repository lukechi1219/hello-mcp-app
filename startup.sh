#!/bin/bash

# Hello MCP App - Local Testing Startup Script
# This script helps you test the MCP server locally with Claude Desktop and Claude CLI

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Hello MCP App - Local Testing                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Running pnpm install...${NC}"
    pnpm install
    echo ""
fi

# Check if dist/src/ui/mcp-app.html exists
if [ ! -f "dist/src/ui/mcp-app.html" ]; then
    echo -e "${YELLOW}⚠️  UI bundle not found. Building UI...${NC}"
    pnpm build:ui
    echo ""
fi

# Display mode selection
echo -e "${GREEN}Select testing mode:${NC}"
echo ""
echo "  1) stdio mode (for Claude Desktop / MCP Inspector)"
echo "  2) HTTP mode (for Remote MCP Connect / testing on port 3000)"
echo "  3) Build all and exit (prepare for deployment)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}Starting stdio mode...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}📋 To connect with Claude Desktop:${NC}"
        echo ""
        echo "   Add this to your claude_desktop_config.json:"
        echo ""
        echo "   {"
        echo "     \"mcpServers\": {"
        echo "       \"hello-world\": {"
        echo "         \"command\": \"npx\","
        echo "         \"args\": [\"tsx\", \"src/entry/stdio.ts\"],"
        echo "         \"cwd\": \"$SCRIPT_DIR\""
        echo "       }"
        echo "     }"
        echo "   }"
        echo ""
        echo -e "${YELLOW}📋 To test with MCP Inspector:${NC}"
        echo ""
        echo "   Run this command in another terminal:"
        echo "   cd $SCRIPT_DIR && npx @modelcontextprotocol/inspector npx tsx src/entry/stdio.ts"
        echo ""
        echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
        echo ""

        # Start the stdio server
        pnpm dev
        ;;

    2)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}Starting HTTP mode...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}📋 Server will start on: http://localhost:3000${NC}"
        echo ""
        echo "   MCP SSE endpoint: http://localhost:3000/sse"
        echo "   Health check:     http://localhost:3000/health"
        echo ""
        echo -e "${YELLOW}📋 To connect with Claude Remote MCP:${NC}"
        echo ""
        echo "   1. Start ngrok: ngrok http 3000"
        echo "   2. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
        echo "   3. Add to Claude Settings > Connectors"
        echo ""
        echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
        echo ""

        # Start the HTTP server
        pnpm dev:http
        ;;

    3)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}Building all components...${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
        echo ""

        # Build UI
        echo -e "${YELLOW}Building UI...${NC}"
        pnpm build:ui

        # Build TypeScript (stdio and node-http)
        echo -e "${YELLOW}Building TypeScript...${NC}"
        pnpm build

        # Build Cloudflare Worker (embed HTML)
        echo -e "${YELLOW}Preparing Cloudflare Worker...${NC}"
        pnpm build:cf

        echo ""
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        echo "Built files:"
        echo "  - dist/entry/stdio.js (stdio mode)"
        echo "  - dist/entry/node-http.js (HTTP server)"
        echo "  - src/entry/cloudflare-worker.ts (Cloudflare Workers, with embedded HTML)"
        echo "  - dist/src/ui/mcp-app.html (UI bundle)"
        echo ""
        echo "Next steps:"
        echo "  - Test stdio: ./startup.sh (option 1)"
        echo "  - Test HTTP: ./startup.sh (option 2)"
        echo "  - Deploy to Cloudflare: pnpm deploy:cf"
        echo "  - Build Docker: docker build -t hello-mcp ."
        echo ""
        ;;

    *)
        echo ""
        echo -e "${YELLOW}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac
