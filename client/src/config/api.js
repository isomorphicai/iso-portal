// Universal API Base URL Resolver
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.port === '5000' || window.location.hostname.includes('iso-middleware'))
    ? '' 
    : (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '' : 'https://iso-middleware-1epx.onrender.com'));

export function apiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL.replace(/\/$/, '')}${cleanPath}`;
}
