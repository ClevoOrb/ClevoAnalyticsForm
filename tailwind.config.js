/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],

  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#080594',
          50: '#f0f0ff',
          100: '#e0e0ff',
          500: '#080594',
          600: '#070483',
          700: '#060372',
          800: '#050261',
          900: '#040150',
        },
        secondary: {
          DEFAULT: '#08B7F6',
          50: '#e6f9ff',
          100: '#b3f0ff',
          400: '#08B7F6',
          500: '#08B7F6',
          600: '#07a5dd',
          700: '#0693c4',
          800: '#0581ab',
          900: '#046f92',
        },
        accent: {
          light: '#11B9F6',
        },
        neutral: {
          50: '#F2F4F7',
          100: '#E8E8E8',
          200: '#D5D5D5',
          300: '#C9C9C9',
          400: '#B6B6B6',
          500: '#848484',
          600: '#646464',
          700: '#2C2C2C',
          800: '#0c0b25',
          900: '#000000',
        },
        error: {
          DEFAULT: '#D40000',
        },
        warning: {
          DEFAULT: '#ffd700',
        },
        success: {
          DEFAULT: '#10b981',
        },
      },
      boxShadow: {
        navbar: "0px 2px 20px 0px rgba(0, 0, 0, 0.36)",
        forminput: "0px -0.5px 2px 0.8px rgba(0, 0, 0, 0.10)",
        text: "3px 8px 11px rgba(0, 0, 0, 0.12)",
      },
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
        poppins: ["Poppins", "sans"],
        quick: ["Quicksand", "sans"],
        inter: ["Inter", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
      },
      screens: {
        small:"300px",
        sm2: "400px",
        sm3: "450px",
        tabxs: "500px",
        tab: "650px",
        tab700:"700px",
        tabxl: "750px",
        tab800:"800px",
        tab900:"900px",
        macxs: "1000px",
        mac1030: "1030px",
        mac1050: "1050px",
        mac11: "1100px",
        mac: "1200px",
        maclg: "1300px",
        md: "1400px",
        mdlg: "1500px",
        xxl: "1600px",
        x3l: "1800px",
        x4l: "1900px",
        x5l: "1940px",
      },
      animation: {
        shake: 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
