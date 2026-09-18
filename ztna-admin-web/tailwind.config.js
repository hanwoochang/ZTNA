/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f54e00',
        'primary-active': '#d04200',
        ink: '#26251e',
        body: '#5a5852',
        muted: '#807d72',
        hairline: '#e6e5e0',
        canvas: '#f7f7f4',
        'canvas-soft': '#fafaf7',
        card: '#ffffff',
        'semantic-success': '#1f8a65',
        'semantic-error': '#cf2d56'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        none: 'none',
      }
    },
  },
  plugins: [],
}
