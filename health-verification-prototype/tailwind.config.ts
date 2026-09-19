import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17221d',
        moss: '#2e6f57',
        mint: '#e7f4ed',
        sand: '#f7f5ef',
        warning: '#e9ae37',
        danger: '#cb4b4b'
      },
      boxShadow: { soft: '0 18px 45px rgba(32, 55, 45, 0.10)' }
    }
  },
  plugins: []
};
export default config;
