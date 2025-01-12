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
        'blue-darker': '#252632',
        'blue-darkest': '#1E1F28',
        cyan: {
          DEFAULT: '#8FD5EA',
          50: '#F0F9FC',
          100: '#E1F3F8',
          200: '#C3E7F1',
          300: '#A6DBE9',
          400: '#8FD5EA',
          500: '#5FC1E0',
          600: '#2FACD6',
          700: '#2589AB',
          800: '#1B677F',
          900: '#124454',
        },
        divider: '#56596C',
        green: {
          DEFAULT: '#97FB9B',
          dark: '#064e3b',
        },
        grey: {
          light: '#A6A6A6',
          lighter: '#D9D9D9',
        },
        purple: '#6F68EB',
        red: '#F58D8A',
        'section-lighter': '#3A3C4A',
      },
      fontFamily: {
        sans: ['Mulish', 'sans-serif'],
      },
    },
  },
}
