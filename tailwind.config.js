/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Romantic palette
        'soft-pink': '#ff9ecb',
        'blush': '#ffb3d9',
        'lavender': '#c8a2ff',
        'soft-purple': '#a87bff',
        // Pastel UNO card colors (slightly desaturated for elegance)
        'card-red': '#f87171',
        'card-blue': '#60a5fa',
        'card-green': '#4ade80',
        'card-yellow': '#fbbf24',
      },
      boxShadow: {
        'card': '0 4px 16px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.12)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.15)',
        'glow-pink': '0 0 24px rgba(244,63,94,0.65)',
        'glow-purple': '0 0 24px rgba(168,123,255,0.65)',
        'glass': '0 8px 32px rgba(0,0,0,0.12)',
      },
      animation: {
        'gradient-flow': 'gradientFlow 12s ease infinite',
        'float': 'floatUp 6s ease-in-out infinite',
        'pulse-glow': 'unoGlow 1.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.8s linear infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-down': 'slideDown 0.3s ease',
      },
      keyframes: {
        gradientFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '33%': { backgroundPosition: '50% 0%' },
          '66%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        floatUp: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        unoGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(244,63,94,0.5)' },
          '50%': { boxShadow: '0 0 32px rgba(244,63,94,0.9), 0 0 60px rgba(251,146,60,0.5)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0)    scale(1)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '4px',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
