/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iso: {
          bg: '#FAF9F6',          // Warm cream/off-white
          bgSecondary: '#F3F1EB', // Deeper warm gray
          cardBg: '#FFFFFF',      // White
          text: '#1A1E24',        // Navy charcoal
          textMuted: '#5F6670',   // Slate blue muted
          primary: '#0A2240',     // Academic Navy Blue
          primaryLight: '#16365C',
          accent: '#C5A059',      // Antique Gold
          accentDark: '#9A7737',
          accentLight: '#EFE6D1',
          border: '#E2DFD6',      // Warm grey-beige
          borderFocus: '#C5A059',
          success: '#2E7D32',
          successBg: '#E8F5E9',
          error: '#C62828',
          errorBg: '#FFEBEE',
        }
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '12px'
      }
    },
  },
  plugins: [],
}
