import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
  type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { greetings, type Greeting } from '../core/greetings.js';

const FADE_DURATION_MS = 800;
const HOLD_DURATION_MS = 2200;

const layoutVariations = [
  { scale: 1.0, offsetY: 0 },
  { scale: 1.15, offsetY: -8 },
  { scale: 0.85, offsetY: 12 },
  { scale: 1.05, offsetY: -4 },
  { scale: 0.9, offsetY: 6 },
  { scale: 1.2, offsetY: -12 },
  { scale: 0.95, offsetY: 10 },
  { scale: 1.1, offsetY: -6 },
  { scale: 0.88, offsetY: 8 },
  { scale: 1.08, offsetY: -10 },
  { scale: 0.92, offsetY: 4 },
  { scale: 1.18, offsetY: -2 },
  { scale: 0.98, offsetY: 14 },
  { scale: 1.12, offsetY: -14 },
  { scale: 0.86, offsetY: 2 },
];

function parseGreetingsFromResult(result: CallToolResult): Greeting[] | null {
  const textContent = result.content?.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') return null;

  try {
    const parsed = JSON.parse(textContent.text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.greetings && Array.isArray(parsed.greetings)) return parsed.greetings;
  } catch {
    // Ignore parse errors, fall back to built-in greetings
  }
  return null;
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

  return <HelloMcpAppInner app={app} toolResult={toolResult} hostContext={hostContext} />;
}

// --- Inner component: all UI ---

interface HelloMcpAppInnerProps {
  app: App;
  toolResult: CallToolResult | null;
  hostContext?: McpUiHostContext;
}

function HelloMcpAppInner({ app, toolResult, hostContext }: HelloMcpAppInnerProps) {
  const [activeGreetings, setActiveGreetings] = useState<Greeting[]>(greetings);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [serverTime, setServerTime] = useState('Loading...');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen'>('inline');
  const [showFullscreenButton, setShowFullscreenButton] = useState(false);
  const [restartCounter, setRestartCounter] = useState(0);

  const isPausedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle tool results (greetings from server)
  useEffect(() => {
    if (!toolResult) return;
    const serverGreetings = parseGreetingsFromResult(toolResult);
    if (serverGreetings) {
      setActiveGreetings(serverGreetings);
      console.info(`[MCP] Updated greetings from server: ${serverGreetings.length} languages`);
    }
  }, [toolResult]);

  // Handle host context changes (display mode, fullscreen availability)
  useEffect(() => {
    if (hostContext?.availableDisplayModes?.includes('fullscreen')) {
      setShowFullscreenButton(true);
    }
    if (hostContext?.displayMode) {
      setDisplayMode(hostContext.displayMode as 'inline' | 'fullscreen');
    }
    if (hostContext?.safeAreaInsets) {
      const { top, right, bottom, left } = hostContext.safeAreaInsets;
      document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }, [hostContext]);

  // Fade animation cycle
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let index = 0;

    function cycle() {
      if (isPausedRef.current) return;

      setCurrentIndex(index);
      setIsVisible(true);

      timeoutId = setTimeout(() => {
        setIsVisible(false);

        timeoutId = setTimeout(() => {
          index = (index + 1) % activeGreetings.length;
          cycle();
        }, FADE_DURATION_MS);
      }, FADE_DURATION_MS + HOLD_DURATION_MS);
    }

    cycle();

    return () => clearTimeout(timeoutId);
  }, [activeGreetings, restartCounter]);

  // IntersectionObserver for pause/resume
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          isPausedRef.current = false;
          setRestartCounter((count) => count + 1);
        } else {
          isPausedRef.current = true;
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Fetch server time
  const fetchServerTime = useCallback(async () => {
    try {
      const result = await app.callServerTool({ name: 'get-server-time', arguments: {} });
      const time = result.content?.find((c) => c.type === 'text');
      setServerTime(time && time.type === 'text' ? time.text : '[ERROR]');
    } catch (error) {
      console.error('[MCP] Failed to get server time:', error);
      setServerTime('[ERROR]');
    }
  }, [app]);

  // Fetch server time on mount
  useEffect(() => {
    fetchServerTime();
  }, [fetchServerTime]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      const newMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen';
      const result = await app.requestDisplayMode({ mode: newMode });
      setDisplayMode(result.mode as 'inline' | 'fullscreen');
    } catch (error) {
      console.error('[MCP] Failed to toggle display mode:', error);
    }
  }, [app, displayMode]);

  // Refresh greetings
  const refreshGreetings = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const result = await app.callServerTool({ name: 'refresh-greetings', arguments: {} });
      const serverGreetings = parseGreetingsFromResult(result);
      if (serverGreetings) {
        setActiveGreetings(serverGreetings);
        console.info(`[MCP] Refreshed greetings: ${serverGreetings.length} languages`);
      }
    } catch (error) {
      console.error('[MCP] Failed to refresh greetings:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [app]);

  const greeting = activeGreetings[currentIndex % activeGreetings.length];
  const layout = layoutVariations[currentIndex % layoutVariations.length];

  return (
    <div
      ref={containerRef}
      class={`welcome-container${displayMode === 'fullscreen' ? ' fullscreen' : ''}`}
    >
      <div class="greeting-wrapper">
        <div
          class={`greeting${isVisible ? ' visible' : ''}`}
          style={{
            transform: `translate(-50%, calc(-50% + ${layout.offsetY}px))`,
          }}
        >
          <h1 style={{ fontSize: `calc(clamp(3rem, 8vw, 6rem) * ${layout.scale})` }}>
            {greeting.text}
          </h1>
          <p>{greeting.nativeName}</p>
        </div>
      </div>

      <div class="server-time">
        <span>{serverTime}</span>
        <button class="control-button" title="Get server time" onClick={fetchServerTime}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div class="version-badge">v2.3 — preact</div>

      <div class="controls">
        {showFullscreenButton && (
          <button
            class={`control-button fullscreen-button${displayMode === 'fullscreen' ? ' active' : ''}`}
            title="Toggle fullscreen"
            onClick={toggleFullscreen}
          >
            <svg class="icon-expand" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg class="icon-collapse" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 2v4H2M10 6h4V2M14 10h-4v4M2 10h4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        )}
        <button
          class={`control-button refresh-button${isRefreshing ? ' loading' : ''}`}
          title="Refresh greetings from server"
          onClick={refreshGreetings}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
}

render(<HelloMcpApp />, document.getElementById('root')!);
