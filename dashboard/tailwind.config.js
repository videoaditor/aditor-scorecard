/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark luxe base
        'body': '#0d0d14',
        'surface': '#12121a',
        'surface-light': '#1a1a24',
        
        // Glass effects
        'glass': 'rgba(255, 255, 255, 0.02)',
        'glass-border': 'rgba(255, 255, 255, 0.06)',
        
        // Accent gradient colors
        'accent-purple': '#8B5CF6',
        'accent-pink': '#EC4899',
        'accent-orange': '#F97316',
        
        // Status colors
        'metric-green': '#22C55E',
        'metric-green-dim': 'rgba(34, 197, 94, 0.15)',
        'metric-yellow': '#FACC15',
        'metric-yellow-dim': 'rgba(250, 204, 21, 0.12)',
        'metric-red': '#EF4444',
        'metric-red-dim': 'rgba(239, 68, 68, 0.12)',
        
        // Text
        'text-primary': '#F5F5F5',
        'text-secondary': 'rgba(255, 255, 255, 0.5)',
        'text-muted': 'rgba(255, 255, 255, 0.3)',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-luxe': 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F97316 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-green': '0 0 15px rgba(34, 197, 94, 0.25)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.25)',
      },
    },
  },
  plugins: [],
}
