/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // RDG palette, taken from the admin panel: deep slate surfaces + emerald actions,
        // with amber kept for prices and attention badges.
        brand: {
          DEFAULT: '#0f172a', // slate-900
          light: '#1e293b', // slate-800
          accent: '#10b981', // emerald-500
          'accent-dark': '#059669', // emerald-600
          gold: '#f59e0b', // amber-500
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(15,23,42,.12)',
        lift: '0 18px 40px -18px rgba(15,23,42,.35)',
      },
      keyframes: {
        'rdg-spin': { to: { transform: 'rotate(360deg)' } },
        'rdg-drive': { '0%': { transform: 'translateX(-60%)' }, '100%': { transform: 'translateX(160%)' } },
        'rdg-fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'rdg-shimmer': { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'rdg-spin': 'rdg-spin .8s linear infinite',
        'rdg-drive': 'rdg-drive 1.1s ease-in-out infinite',
        'rdg-fade-up': 'rdg-fade-up .35s ease-out both',
        'rdg-shimmer': 'rdg-shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
}
