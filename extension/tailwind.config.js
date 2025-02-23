/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html,css}"],
  darkMode: "media",
  prefix: "plasmo-",
  theme: {
    extend: {
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    }
  }
}
