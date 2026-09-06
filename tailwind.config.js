/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        raven: {
          50: '#f4f6fb',
          100: '#e8edf6',
          200: '#cbd7ec',
          300: '#9eb5dd',
          400: '#6b8fc9',
          500: '#466db3',
          600: '#345496',
          700: '#2a437a',
          800: '#1b294b',
          900: '#0f172a',
          950: '#070b16',
        }
      }
    },
  },
  plugins: [],
};
