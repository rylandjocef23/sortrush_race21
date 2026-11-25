/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        canvas: '#0c0d10',
        surface: '#14161b',
        elevated: '#1b1e25',
        border: '#242830',
        muted: '#8b92a5',
        player: '#38bdf8',
        opponent: '#f97316',
        danger: '#ef4444',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
};
