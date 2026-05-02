/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary backgrounds
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#13131a',
        'bg-tertiary': '#1a1a24',
        
        // Gold accents
        'gold': {
          DEFAULT: '#fbbf24',
          light: '#fef3c7',
          dark: '#f59e0b',
        },
        
        // Status colors
        'critical': '#ef4444',
        'high': '#f97316',
        'medium': '#eab308',
        'low': '#3b82f6',
        
        // Text colors
        'text-primary': '#f9fafb',
        'text-secondary': '#d1d5db',
        'text-tertiary': '#9ca3af',
        
        // Borders
        'border-primary': '#27272a',
        'border-accent': '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(251, 191, 36, 0.3)',
        'gold-lg': '0 0 40px rgba(251, 191, 36, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}

// Made with Bob
