import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './context/LanguageContext.tsx';

// Suppress benign Firestore clock drift warning in the console
const suppressFutureTimeWarning = (...args: any[]) => {
  try {
    const msg = args
      .map((arg) => (typeof arg === "string" ? arg : arg instanceof Error ? arg.message : String(arg)))
      .join(" ");
    if (msg.includes("Detected an update time that is in the future")) {
      return true; // Filtered/suppressed
    }
  } catch (e) {
    // Fallback if formatting fails
  }
  return false;
};

const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  if (suppressFutureTimeWarning(...args)) return;
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args: any[]) {
  if (suppressFutureTimeWarning(...args)) return;
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

