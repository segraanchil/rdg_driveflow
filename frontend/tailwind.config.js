/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Condensed caps like the logo's "CAR DEALS & SERVICES" lettering: page titles and labels.
        display: ['"Barlow Condensed"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        /*
         * RDG brand = the logo: black ink on white. The palette is monochrome.
         *  - `slate` (all surfaces/text) is remapped to true neutral grays, no blue tint.
         *  - `emerald` (the old accent) is remapped to "ink" by how the code uses it: 500–900 are
         *    near-black for actions, links and borders on light surfaces; 300–400 are light grays
         *    because they only appear as text/bars on dark surfaces; 50–200 are tints.
         *  - Status colours (green/amber/red/sky/violet) stay as they are: they carry meaning.
         */
        slate: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3',
          500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#141414', 950: '#0a0a0a',
        },
        emerald: {
          50: '#f4f4f4', 100: '#e8e8e8', 200: '#d6d6d6', 300: '#e5e5e5', 400: '#d4d4d4',
          500: '#141414', 600: '#000000', 700: '#141414', 800: '#000000', 900: '#000000', 950: '#000000',
        },
        teal: { 500: '#3f3f3f' }, // only used as the far end of black "carbon" gradients
        brand: {
          DEFAULT: '#141414',
          light: '#262626',
          accent: '#141414',
          'accent-dark': '#000000',
          paper: '#f7f7f5', // the logo's off-white
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.14)',
        lift: '0 18px 40px -18px rgba(0,0,0,.4)',
      },
      keyframes: {
        'rdg-spin': { to: { transform: 'rotate(360deg)' } },
        'rdg-drive': { '0%': { transform: 'translateX(-60%)' }, '100%': { transform: 'translateX(160%)' } },
        'rdg-fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'rdg-shimmer': { '100%': { transform: 'translateX(100%)' } },
        'rdg-road': { '0%': { left: '-25%' }, '100%': { left: '105%' } },
      },
      animation: {
        'rdg-spin': 'rdg-spin .8s linear infinite',
        'rdg-drive': 'rdg-drive 1.1s ease-in-out infinite',
        'rdg-fade-up': 'rdg-fade-up .35s ease-out both',
        'rdg-shimmer': 'rdg-shimmer 1.4s infinite',
        'rdg-road': 'rdg-road 1.5s cubic-bezier(.45,.05,.55,.95) infinite',
      },
    },
  },
  plugins: [],
}
