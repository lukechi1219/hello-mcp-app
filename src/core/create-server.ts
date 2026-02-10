import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { greetings } from './greetings.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST_DIR = path.join(currentDirectory, '../..');

export function createServer(distDir: string = DEFAULT_DIST_DIR): McpServer {
  const server = new McpServer({
    name: 'hello-mcp-app',
    version: '1.0.0',
  });

  const resourceUri = 'ui://hello-world/mcp-app.html';

  registerAppTool(
    server,
    'hello-world',
    {
      title: 'Hello World',
      description: 'Display multilingual "Hello World~" greetings with iPhone-style fade animations',
      inputSchema: {},
      _meta: {
        ui: {
          resourceUri,
        },
      },
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(greetings, null, 2),
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    'refresh-greetings',
    {
      title: 'Refresh Greetings',
      description: 'Re-fetch the current greeting data with server timestamp',
      inputSchema: {},
      _meta: {
        ui: {
          resourceUri,
          visibility: ['app'],
        },
      },
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              greetings,
              refreshedAt: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  );

  registerAppResource(
    server,
    'Hello World UI',
    resourceUri,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'iPhone-style multilingual welcome screen with fade-cycling animation',
    },
    async () => {
      const htmlContent = await fs.readFile(
        path.join(distDir, 'dist/src/ui/mcp-app.html'),
        'utf-8'
      );
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: htmlContent,
          },
        ],
      };
    }
  );

  return server;
}
