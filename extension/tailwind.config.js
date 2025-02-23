/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{tsx,html}'],
  darkMode: 'media',
  prefix: 'plasmo-', // Consistent prefix for Shadow DOM compatibility
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Clean, modern font
      },
      colors: {
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          500: '#6B7280',
          700: '#374151',
          900: '#111827',
        },
        blue: {
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      spacing: {
        18: '4.5rem', // For larger whitespace
      },
      boxShadow: {
        sleek: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)', // Subtle, elegant shadow
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
      keyframes: {
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
