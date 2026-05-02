/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Enterprise SaaS UI - Design System Colors
        primary: '#4F46E5',        // Indigo 600
        'on-primary': '#FFFFFF',   // White text on primary
        secondary: '#F8FAFC',      // Slate 50
        accent: '#0EA5E9',         // Sky 500
        background: '#FFFFFF',     // Pure white background
        foreground: '#0F172A',     // Slate 900 text
        muted: '#F1F5F9',          // Slate 100 muted
        border: '#E2E8F0',         // Slate 200 border
        destructive: '#EF4444',    // Red 500
        ring: '#818CF8',           // Indigo 400 focus ring
        
        // Status colors (severity badges)
        'critical': '#DC2626',     // Red 600
        'high': '#EA580C',         // Orange 600
        'medium': '#D97706',       // Amber 600
        'low': '#059669',          // Emerald 600
        
        // Legacy aliases for compatibility
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F8FAFC',
        'bg-tertiary': '#F1F5F9',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-tertiary': '#64748B',
        'border-primary': '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
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
          '0%': { transform: 'translateY(10px)', opacity: '0' },
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
