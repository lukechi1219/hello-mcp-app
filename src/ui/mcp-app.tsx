import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { BudgetDataResponse } from '../core/budget-data.js';
import { HelloWorld } from './components/HelloWorld.js';
import { BudgetAllocator } from './components/BudgetAllocator.js';

type ViewType = 'greeting' | 'budget';

function detectView(result: CallToolResult): ViewType {
  const structured = result.structuredContent as Record<string, unknown> | undefined;
  if (structured?.config && typeof structured.config === 'object') {
    const config = structured.config as Record<string, unknown>;
    if (Array.isArray(config.categories)) {
      return 'budget';
    }
  }
  return 'greeting';
}

// --- Outer component: SDK lifecycle ---

function HelloMcpApp() {
  const [app, setApp] = useState<App | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();

  useEffect(() => {
    if (hostContext?.theme) {
      applyDocumentTheme(hostContext.theme);
    }
    if (hostContext?.styles?.variables) {
      applyHostStyleVariables(hostContext.styles.variables);
    }
    if (hostContext?.styles?.css?.fonts) {
      applyHostFonts(hostContext.styles.css.fonts);
    }
  }, [hostContext]);

  useEffect(() => {
    const instance = new App({ name: 'HelloMcpApp', version: '1.0.0' });

    instance.ontoolinput = async (params) => {
      console.debug('[MCP] Tool input received:', params.arguments);
    };

    instance.ontoolresult = async (result) => {
      console.info('[MCP] Tool result received');
      setToolResult(result);
    };

    instance.onhostcontextchanged = (params) => {
      setHostContext((previous) => ({ ...previous, ...params }));
    };

    instance.onteardown = async () => {
      console.info('[MCP] Teardown requested');
      return {};
    };

    instance
      .connect()
      .then(() => {
        setApp(instance);
        setHostContext(instance.getHostContext());
        console.info('[MCP] App connected successfully');
      })
      .catch(setError);
  }, []);

  if (error) return <div><strong>ERROR:</strong> {error.message}</div>;
  if (!app) return <div>Connecting...</div>;

  // Detect view type from tool result
  const view: ViewType = toolResult ? detectView(toolResult) : 'greeting';

  if (view === 'budget' && toolResult) {
    const budgetData = toolResult.structuredContent as unknown as BudgetDataResponse;
    return <BudgetAllocator data={budgetData} app={app} />;
  }

  return <HelloWorld app={app} toolResult={toolResult} hostContext={hostContext} />;
}

render(<HelloMcpApp />, document.getElementById('root')!);
