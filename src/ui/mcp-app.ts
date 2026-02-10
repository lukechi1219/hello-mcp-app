import { App, applyDocumentTheme, applyHostStyleVariables, applyHostFonts } from '@modelcontextprotocol/ext-apps';
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

let animationTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isAnimationPaused = false;
let isInitialized = false;
let activeGreetings: Greeting[] = greetings;
let currentDisplayMode: 'inline' | 'fullscreen' = 'inline';

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

let connectedApp: App | null = null;

function log(level: LogLevel, data: string | Record<string, unknown>): void {
  const consoleMethod = level === 'warning' ? 'warn' : level;
  (console[consoleMethod as 'log'] ?? console.log)(`[MCP] ${typeof data === 'string' ? data : JSON.stringify(data)}`);

  connectedApp?.sendLog({ level, data }).catch(() => {});
}

let showGreeting: (() => void) | null = null;

function initializeWelcomeScreen(): void {
  if (isInitialized) {
    showGreeting?.();
    return;
  }

  const container = document.querySelector('.greeting-wrapper') as HTMLElement;
  if (!container) return;

  isInitialized = true;

  const greetingElement = document.createElement('div');
  greetingElement.className = 'greeting';

  const title = document.createElement('h1');
  const subtitle = document.createElement('p');

  greetingElement.appendChild(title);
  greetingElement.appendChild(subtitle);
  container.appendChild(greetingElement);

  let currentIndex = 0;

  showGreeting = function (): void {
    if (isAnimationPaused) return;

    const greeting = activeGreetings[currentIndex];
    const layout = layoutVariations[currentIndex % layoutVariations.length];

    greetingElement.style.transform = `translate(-50%, calc(-50% + ${layout.offsetY}px))`;
    title.style.fontSize = `calc(clamp(3rem, 8vw, 6rem) * ${layout.scale})`;

    title.textContent = greeting.text;
    subtitle.textContent = greeting.nativeName;

    greetingElement.classList.add('visible');

    animationTimeoutId = setTimeout(() => {
      greetingElement.classList.remove('visible');

      animationTimeoutId = setTimeout(() => {
        currentIndex = (currentIndex + 1) % activeGreetings.length;
        showGreeting!();
      }, FADE_DURATION_MS);
    }, FADE_DURATION_MS + HOLD_DURATION_MS);
  };

  showGreeting();
}

function setupVisibilityObserver(): void {
  const mainElement = document.querySelector('.welcome-container');
  if (!mainElement) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        isAnimationPaused = false;
        if (!animationTimeoutId) {
          initializeWelcomeScreen();
        }
      } else {
        isAnimationPaused = true;
        if (animationTimeoutId) {
          clearTimeout(animationTimeoutId);
          animationTimeoutId = null;
        }
      }
    });
  });

  observer.observe(mainElement);
}

function parseGreetingsFromResult(result: { content?: Array<{ type: string; text?: string }> }): Greeting[] | null {
  const textContent = result.content?.find((c) => c.type === 'text')?.text;
  if (!textContent) return null;

  try {
    const parsed = JSON.parse(textContent);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.greetings && Array.isArray(parsed.greetings)) return parsed.greetings;
  } catch {
    // Ignore parse errors, fall back to built-in greetings
  }
  return null;
}

async function initializeMcpApp(): Promise<void> {
  try {
    const app = new App({ name: 'HelloMcpApp', version: '1.0.0' });

    app.ontoolinput = (params) => {
      log('debug', `Tool input received: ${JSON.stringify(params.arguments)}`);
    };

    app.ontoolresult = (result) => {
      log('info', 'Tool result received');
      const serverGreetings = parseGreetingsFromResult(result);
      if (serverGreetings) {
        activeGreetings = serverGreetings;
        log('info', `Updated greetings from server: ${activeGreetings.length} languages`);
      }
    };

    app.onhostcontextchanged = (context) => {
      log('debug', `Host context changed: displayMode=${context.displayMode}, theme=${context.theme}`);

      if (context.theme) {
        applyDocumentTheme(context.theme);
      }
      if (context.styles?.variables) {
        applyHostStyleVariables(context.styles.variables);
      }
      if (context.styles?.css?.fonts) {
        applyHostFonts(context.styles.css.fonts);
      }
      if (context.safeAreaInsets) {
        const { top, right, bottom, left } = context.safeAreaInsets;
        document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }

      const fullscreenButton = document.getElementById('fullscreen-btn');
      if (fullscreenButton) {
        if (context.availableDisplayModes?.includes('fullscreen')) {
          fullscreenButton.style.display = 'flex';
        }
        if (context.displayMode) {
          currentDisplayMode = context.displayMode as 'inline' | 'fullscreen';
          const container = document.querySelector('.welcome-container');
          container?.classList.toggle('fullscreen', currentDisplayMode === 'fullscreen');
          fullscreenButton.classList.toggle('active', currentDisplayMode === 'fullscreen');
        }
      }
    };

    app.onteardown = async () => {
      log('info', 'Teardown requested');
      if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
        animationTimeoutId = null;
      }
      return {};
    };

    await app.connect();
    connectedApp = app;
    log('info', 'App connected successfully');

    const refreshButton = document.getElementById('refresh-btn');
    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        try {
          refreshButton.classList.add('loading');
          const result = await app.callServerTool({ name: 'refresh-greetings', arguments: {} });
          const serverGreetings = parseGreetingsFromResult(result);
          if (serverGreetings) {
            activeGreetings = serverGreetings;
            log('info', `Refreshed greetings: ${activeGreetings.length} languages`);
          }
        } catch (error) {
          log('error', `Failed to refresh greetings: ${error}`);
        } finally {
          refreshButton.classList.remove('loading');
        }
      });
    }
    const fullscreenButton = document.getElementById('fullscreen-btn');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', async () => {
        try {
          const newMode = currentDisplayMode === 'fullscreen' ? 'inline' : 'fullscreen';
          const result = await app.requestDisplayMode({ mode: newMode });
          currentDisplayMode = result.mode as 'inline' | 'fullscreen';
        } catch (error) {
          log('error', `Failed to toggle display mode: ${error}`);
        }
      });
    }
  } catch (error) {
    log('error', `App initialization error: ${error}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeWelcomeScreen();
  setupVisibilityObserver();
  initializeMcpApp();
});
