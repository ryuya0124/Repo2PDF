/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,jsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#61afef',
        secondary: '#98c379',
        accent: '#e6c07b',
        danger: '#e06c75',
        dark: {
          bg: '#1e2127',
          card: '#282c34',
          border: '#3e4451',
          text: '#abb2bf',
          muted: '#5c6370'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
