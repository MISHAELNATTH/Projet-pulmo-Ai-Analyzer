/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        outline: "#859491",
        primary: "#47efe0",
        "on-error-container": "#ffdad6",
        "tertiary-fixed": "#dfe2eb",
        "surface-container-low": "#141c24",
        "surface-container-highest": "#2d363e",
        "surface-dim": "#0b141c",
        "primary-fixed": "#56faeb",
        "tertiary-fixed-dim": "#c3c6cf",
        "inverse-primary": "#006a63",
        secondary: "#c2c7d0",
        "surface-tint": "#28ddcf",
        "on-secondary-container": "#b1b5bf",
        "on-tertiary": "#2d3137",
        "on-tertiary-fixed-variant": "#43474e",
        "on-error": "#690005",
        "on-secondary-fixed": "#171c23",
        "on-primary-fixed": "#00201d",
        "on-surface": "#dae3ee",
        "secondary-fixed": "#dee2ec",
        "primary-container": "#00d2c4",
        "on-primary-fixed-variant": "#00504a",
        "inverse-surface": "#dae3ee",
        "on-primary-container": "#00554f",
        "primary-fixed-dim": "#28ddcf",
        "on-secondary": "#2c3138",
        "surface-container": "#182028",
        "secondary-fixed-dim": "#c2c7d0",
        "on-primary": "#003733",
        error: "#ffb4ab",
        surface: "#0b141c",
        "on-secondary-fixed-variant": "#42474f",
        "on-tertiary-container": "#484c53",
        "outline-variant": "#3b4a47",
        "surface-variant": "#2d363e",
        "surface-container-high": "#222b33",
        background: "#0b141c",
        "secondary-container": "#42474f",
        "surface-bright": "#313a43",
        "on-surface-variant": "#bacac7",
        tertiary: "#d5d8e0",
        "surface-container-lowest": "#060f16",
        "tertiary-container": "#b9bcc5",
        "error-container": "#93000a",
        "inverse-on-surface": "#29313a",
        "on-tertiary-fixed": "#181c22",
        "on-background": "#dae3ee"
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      spacing: {
        "margin-page": "16px",
        "stack-gap": "8px",
        "panel-padding": "12px",
        gutter: "12px",
        "sidebar-width": "64px"
      },
      fontFamily: {
        "mono-data": ["Inter", "monospace"],
        "body-md": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "title-sm": ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
}
