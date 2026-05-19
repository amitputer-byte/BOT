/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFD93D',
        'primary-dark': '#FFB800',
        secondary: '#4ECDC4',
        accent: '#FF6B9D',
        success: '#6BCB77',
        error: '#FF8A8A',
        bg: '#FFF9E6',
        'dark-ink': '#2D2D44',
      },
      fontFamily: {
        fredoka: ['Fredoka', 'sans-serif'],
        varela: ['Varela Round', 'sans-serif'],
      },
      boxShadow: {
        comic: '4px 4px 0 #2D2D44',
        'comic-lg': '6px 6px 0 #2D2D44',
        'comic-sm': '2px 2px 0 #2D2D44',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
