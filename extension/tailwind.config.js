/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{tsx,html}'],
  darkMode: 'class', // Changed from 'media' to 'class' for user toggle control
  prefix: 'plasmo-', // Consistent prefix for Shadow DOM compatibility
  safelist: [
    // Error handling classes
    'hover:plasmo-text-error-600',
    'hover:plasmo-bg-error-50',
    'focus:plasmo-ring-error-400',
    
    // Category background colors
    'plasmo-bg-red-100', 'plasmo-bg-red-600',
    'plasmo-bg-blue-100', 'plasmo-bg-blue-600',
    'plasmo-bg-green-100', 'plasmo-bg-green-600',
    'plasmo-bg-purple-100', 'plasmo-bg-purple-600',
    'plasmo-bg-yellow-100', 'plasmo-bg-yellow-500',
    'plasmo-bg-pink-100', 'plasmo-bg-pink-600',
    'plasmo-bg-indigo-100', 'plasmo-bg-indigo-600',
    'plasmo-bg-teal-100', 'plasmo-bg-teal-600',
    'plasmo-bg-orange-100', 'plasmo-bg-orange-600',
    'plasmo-bg-amber-100', 'plasmo-bg-amber-600',
    'plasmo-bg-lime-100', 'plasmo-bg-lime-600',
    'plasmo-bg-emerald-100', 'plasmo-bg-emerald-600',
    'plasmo-bg-cyan-100', 'plasmo-bg-cyan-600',
    'plasmo-bg-sky-100', 'plasmo-bg-sky-600',
    'plasmo-bg-violet-100', 'plasmo-bg-violet-600',
    'plasmo-bg-fuchsia-100', 'plasmo-bg-fuchsia-600',
    'plasmo-bg-rose-100', 'plasmo-bg-rose-600',
    
    // Category text colors
    'plasmo-text-red-800', 'plasmo-text-white',
    'plasmo-text-blue-800', 'plasmo-text-white',
    'plasmo-text-green-800', 'plasmo-text-white',
    'plasmo-text-purple-800', 'plasmo-text-white',
    'plasmo-text-yellow-800', 'plasmo-text-white',
    'plasmo-text-pink-800', 'plasmo-text-white',
    'plasmo-text-indigo-800', 'plasmo-text-white',
    'plasmo-text-teal-800', 'plasmo-text-white',
    'plasmo-text-orange-800', 'plasmo-text-white',
    'plasmo-text-amber-800', 'plasmo-text-white',
    'plasmo-text-lime-800', 'plasmo-text-white',
    'plasmo-text-emerald-800', 'plasmo-text-white',
    'plasmo-text-cyan-800', 'plasmo-text-white',
    'plasmo-text-sky-800', 'plasmo-text-white',
    'plasmo-text-violet-800', 'plasmo-text-white',
    'plasmo-text-fuchsia-800', 'plasmo-text-white',
    'plasmo-text-rose-800', 'plasmo-text-white',
    
    // Category border colors
    'plasmo-border-red-300', 'plasmo-border-transparent',
    'plasmo-border-blue-300', 'plasmo-border-transparent',
    'plasmo-border-green-300', 'plasmo-border-transparent',
    'plasmo-border-purple-300', 'plasmo-border-transparent',
    'plasmo-border-yellow-300', 'plasmo-border-transparent',
    'plasmo-border-pink-300', 'plasmo-border-transparent',
    'plasmo-border-indigo-300', 'plasmo-border-transparent',
    'plasmo-border-teal-300', 'plasmo-border-transparent',
    'plasmo-border-orange-300', 'plasmo-border-transparent',
    'plasmo-border-amber-300', 'plasmo-border-transparent',
    'plasmo-border-lime-300', 'plasmo-border-transparent',
    'plasmo-border-emerald-300', 'plasmo-border-transparent',
    'plasmo-border-cyan-300', 'plasmo-border-transparent',
    'plasmo-border-sky-300', 'plasmo-border-transparent',
    'plasmo-border-violet-300', 'plasmo-border-transparent',
    'plasmo-border-fuchsia-300', 'plasmo-border-transparent',
    'plasmo-border-rose-300', 'plasmo-border-transparent'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
      },
      lineHeight: {
        tighter: '1.1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },
      colors: {
        // Primary color - Blue
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Secondary color - Teal
        secondary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        // Accent color - Amber
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Extended gray palette
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0A0F1A',
        },
        // Status colors
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          700: '#047857',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          700: '#B91C1C',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          700: '#B45309',
        },
        info: {
          50: '#EFF6FF',
          500: '#3B82F6',
          700: '#1D4ED8',
        },
      },
      spacing: {
        18: '4.5rem',
        68: '17rem',
        84: '21rem',
        88: '22rem',
        92: '23rem',
        128: '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // More refined shadows
        'sm-light': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        light: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        DEFAULT: '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        card: '0 2px 5px -1px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.01)',
        dropdown: '0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'bounce-light': 'bounce-light 1s infinite',
        'pulse-light': 'pulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        'bounce-light': {
          '0%, 100%': {
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'pulse-light': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.8',
          },
        },
      },
      transitionProperty: {
        'max-height': 'max-height',
        spacing: 'margin, padding',
      },
      transitionDuration: {
        0: '0ms',
        400: '400ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [],
};