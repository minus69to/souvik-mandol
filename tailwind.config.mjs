/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/data/**/*.js",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", 
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
