import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
  const server = createServer({
    htmlLoader: loadHtml,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Hello MCP App running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
