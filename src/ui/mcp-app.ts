import { App, PostMessageTransport } from '@modelcontextprotocol/ext-apps';
import { greetings } from '../core/greetings.js';

const FADE_DURATION_MS = 800;
const HOLD_DURATION_MS = 2200;

// Predefined layout variations for visual variety
// Each defines a font size scale, vertical offset, and horizontal alignment
const layoutVariations = [
  { scale: 1.0, offsetY: 0, align: 'center' },
  { scale: 1.15, offsetY: -8, align: 'center' },
  { scale: 0.85, offsetY: 12, align: 'center' },
  { scale: 1.05, offsetY: -4, align: 'center' },
  { scale: 0.9, offsetY: 6, align: 'center' },
  { scale: 1.2, offsetY: -12, align: 'center' },
  { scale: 0.95, offsetY: 10, align: 'center' },
  { scale: 1.1, offsetY: -6, align: 'center' },
  { scale: 0.88, offsetY: 8, align: 'center' },
  { scale: 1.08, offsetY: -10, align: 'center' },
  { scale: 0.92, offsetY: 4, align: 'center' },
  { scale: 1.18, offsetY: -2, align: 'center' },
  { scale: 0.98, offsetY: 14, align: 'center' },
  { scale: 1.12, offsetY: -14, align: 'center' },
  { scale: 0.86, offsetY: 2, align: 'center' },
];

function initializeWelcomeScreen(): void {
  const container = document.querySelector('.greeting-wrapper') as HTMLElement;
  if (!container) {
    console.error('Greeting wrapper not found');
    return;
  }

  // Create a single greeting display element
  const greetingElement = document.createElement('div');
  greetingElement.className = 'greeting';

  const title = document.createElement('h1');
  const subtitle = document.createElement('p');

  greetingElement.appendChild(title);
  greetingElement.appendChild(subtitle);
  container.appendChild(greetingElement);

  let currentIndex = 0;

  function showGreeting(): void {
    const greeting = greetings[currentIndex];
    const layout = layoutVariations[currentIndex % layoutVariations.length];

    // Apply layout variation
    greetingElement.style.transform = `translate(-50%, calc(-50% + ${layout.offsetY}px))`;
    title.style.fontSize = `calc(clamp(3rem, 8vw, 6rem) * ${layout.scale})`;

    // Set content
    title.textContent = greeting.text;
    subtitle.textContent = greeting.nativeName;

    // Fade in
    greetingElement.classList.add('visible');

    // After hold, fade out
    setTimeout(() => {
      greetingElement.classList.remove('visible');

      // After fade out, show next
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % greetings.length;
        showGreeting();
      }, FADE_DURATION_MS);
    }, FADE_DURATION_MS + HOLD_DURATION_MS);
  }

  showGreeting();
}

async function initializeMcpApp(): Promise<void> {
  try {
    const app = new App(
      { name: 'HelloMcpApp', version: '1.0.0' },
      {}
    );

    app.ontoolinput = (params) => {
      console.log('Tool input received:', params.arguments);
    };

    await app.connect(new PostMessageTransport(window.parent, window.parent));
    console.log('MCP App connected successfully');
  } catch (error) {
    console.error('MCP App initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeWelcomeScreen();
  initializeMcpApp();
});
