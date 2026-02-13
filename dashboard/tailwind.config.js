/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'body': '#141414',
        'glass': 'rgba(255, 255, 255, 0.03)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'accent': '#FF6A00',
        'accent-dim': 'rgba(255, 106, 0, 0.6)',
        'accent-glow': 'rgba(255, 106, 0, 0.15)',
        'metric-green': '#22C55E',
        'metric-yellow': '#FACC15',
        'metric-red': '#EF4444',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
}
