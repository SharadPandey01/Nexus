/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        card: 'rgba(20, 20, 20, 0.65)',
        primary: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        text: {
          primary: '#FFFFFF',
          secondary: '#AFAFAF'
        },
        agents: {
          chronos: '#60a5fa',
          hermes: '#34d399',
          apollo: '#a78bfa',
          athena: '#fb923c'
        }
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'reverse-spin': 'reverse-spin 10s linear infinite',
        'fade-up': 'fadeUp 0.4s ease both',
        'shimmer': 'shimmer 1.4s infinite linear',
      },
      keyframes: {
        'reverse-spin': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      }
    },
  },
  plugins: [],
}
