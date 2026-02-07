import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from '../core/create-server.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(currentDirectory, '../..');

async function loadHtml(): Promise<string> {
  const htmlPath = join(projectRoot, 'dist/src/ui/mcp-app.html');
  return await readFile(htmlPath, 'utf-8');
}

async function main() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  const mcpServer = createServer({
    htmlLoader: loadHtml,
  });

  app.get('/sse', async (req, res) => {
    const transport = new SSEServerTransport('/message', res);
    await mcpServer.connect(transport);
  });

  app.post('/message', async (req, res) => {
    res.status(200).end();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'hello-mcp-app' });
  });

  app.listen(port, () => {
    console.log(`Hello MCP App listening on port ${port}`);
    console.log(`MCP SSE endpoint: http://localhost:${port}/sse`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
