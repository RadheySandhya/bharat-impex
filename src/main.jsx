import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initSecurityProtection } from './utils/securityProtection';

// Capture the browser's install prompt as early as possible so an "Install App" button can use it
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__biInstallPrompt = e;
  window.dispatchEvent(new Event('bi:installable'));
});

// Initialize Browser DevTools & Inspect Element Blocker
initSecurityProtection();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Installable app: register the service worker in production builds only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker registration failed:', err));
  });
}
