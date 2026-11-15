/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coal: { 50: '#f3f4f5', 100: '#e4e7ea', 200: '#c9d0d6', 500: '#66727e', 700: '#2f3a44', 900: '#1b232b' },
        ember: { 50: '#fdf1e7', 500: '#c2561a', 600: '#a84712' },
      },
      fontFamily: { sans: ['Vazirmatn', 'Tahoma', 'sans-serif'] },
    },
  },
  plugins: [],
};
