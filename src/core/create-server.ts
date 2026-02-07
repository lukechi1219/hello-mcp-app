import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { greetings } from './greetings.js';

export interface CreateServerOptions {
  htmlLoader: () => Promise<string> | string;
}

export function createServer(options: CreateServerOptions): McpServer {
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

  registerAppResource(
    server,
    'Hello World UI',
    resourceUri,
    {
      mimeType: RESOURCE_MIME_TYPE,
      description: 'iPhone-style multilingual welcome screen with fade-cycling animation',
    },
    async () => {
      const htmlContent = await options.htmlLoader();
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
