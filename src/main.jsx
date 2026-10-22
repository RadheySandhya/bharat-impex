import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initSecurityProtection } from './utils/securityProtection';

// Initialize Browser DevTools & Inspect Element Blocker
initSecurityProtection();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
