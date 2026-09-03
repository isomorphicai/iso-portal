import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Automatically route all /api requests to live backend when deployed independently
const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') && !window.location.hostname.includes('iso-middleware') 
    ? 'https://iso-middleware-1epx.onrender.com' 
    : '');

if (API_BASE && typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      resource = `${API_BASE.replace(/\/$/, '')}${resource}`;
    }
    return originalFetch(resource, init);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
