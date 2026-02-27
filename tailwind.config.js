/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{tsx,ts,jsx,js}',
    '!./node_modules/**',
    '!./archive/**',
    '!./dist/**',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
