/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Placeholder brand palette — swap for RDG Car Deals & Services' actual brand colors.
        brand: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          accent: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
