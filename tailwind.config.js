/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line import/no-anonymous-default-export, import/no-default-export
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: [],
  theme: {
    extend: {
      colors: {
        background: '#202027',
        'blue-dark': '#2E303C',
        cyan: '#8FD5EA',
        divider: '#56596C',
        "green": "#97FB9B",
        'dark-green': '#064e3b',
        'grey-light': '#A6A6A6',
        'grey-lighter': '#D9D9D9',
        purple: '#6F68EB',
        red: '#F58D8A',
        'section-lighter': '#3A3C4A',
        white: '#FFFFFF',
      },
    },
  },
}
