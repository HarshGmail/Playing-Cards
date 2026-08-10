/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'pos-1': 'hsl(var(--pos-1) / <alpha-value>)',
        'pos-2': 'hsl(var(--pos-2) / <alpha-value>)',
        'pos-3': 'hsl(var(--pos-3) / <alpha-value>)',
        'pos-last': 'hsl(var(--pos-last) / <alpha-value>)',
        'pos-mid': 'hsl(var(--pos-mid) / <alpha-value>)',
        'pos-dnf': 'hsl(var(--pos-dnf) / <alpha-value>)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
