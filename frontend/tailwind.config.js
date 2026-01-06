/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Telegram theme colors (CSS variables)
        tg: {
          bg: 'var(--tg-theme-bg-color, #1C1C1E)',
          text: 'var(--tg-theme-text-color, #FFFFFF)',
          hint: 'var(--tg-theme-hint-color, #8E8E93)',
          link: 'var(--tg-theme-link-color, #007AFF)',
          button: 'var(--tg-theme-button-color, #007AFF)',
          'button-text': 'var(--tg-theme-button-text-color, #FFFFFF)',
          secondary: 'var(--tg-theme-secondary-bg-color, #2C2C2E)',
        },
        // Surface colors (Bloomberg/Revolut inspired)
        surface: {
          DEFAULT: '#1C1C1E',
          elevated: '#2C2C2E',
          hover: '#3A3A3C',
          glass: 'rgba(28, 28, 30, 0.7)',
        },
        // Semantic colors
        success: {
          DEFAULT: '#30D158',
          soft: 'rgba(48, 209, 88, 0.15)',
        },
        warning: {
          DEFAULT: '#FFD60A',
          soft: 'rgba(255, 214, 10, 0.15)',
        },
        danger: {
          DEFAULT: '#FF453A',
          soft: 'rgba(255, 69, 58, 0.15)',
        },
        // Crypto colors
        crypto: {
          up: '#30D158',
          down: '#FF453A',
          neutral: '#8E8E93',
        },
        // Border colors
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          subtle: 'rgba(255, 255, 255, 0.05)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display': ['36px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline': ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        'headline-sm': ['17px', { lineHeight: '1.2', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '1.4', fontWeight: '400' }],
        'body': ['15px', { lineHeight: '1.4', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'label-lg': ['17px', { lineHeight: '1.2', fontWeight: '500' }],
        'label': ['15px', { lineHeight: '1.2', fontWeight: '500' }],
        'label-sm': ['13px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 0 0 1px rgba(255, 255, 255, 0.05)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
