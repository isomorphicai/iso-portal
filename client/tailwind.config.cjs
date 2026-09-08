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
          bg: 'var(--iso-bg, #FAF9F6)',          // Warm cream/off-white
          bgSecondary: 'var(--iso-bgSecondary, #F3F1EB)', // Deeper warm gray
          cardBg: 'var(--iso-cardBg, #FFFFFF)',      // White
          text: 'var(--iso-text, #1A1E24)',        // Navy charcoal
          textMuted: 'var(--iso-textMuted, #5F6670)',   // Slate blue muted
          primary: 'var(--iso-primary, #0A2240)',     // Academic Navy Blue / ButtonandLeftBarColor
          primaryLight: 'var(--iso-primaryLight, #16365C)',
          accent: 'var(--iso-accent, #C5A059)',      // BordersColor / Accent
          accentDark: 'var(--iso-accentDark, #9A7737)',
          accentLight: 'var(--iso-accentLight, #EFE6D1)',
          border: 'var(--iso-border, #E2DFD6)',      // Border color
          borderFocus: 'var(--iso-borderFocus, #C5A059)',
          buttonFont: 'var(--iso-buttonFont, #ffffff)',
          disableButton: 'var(--iso-disableButton, #c1c1c1)',
          forgotFont: 'var(--iso-forgotFont, #373737)',
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
