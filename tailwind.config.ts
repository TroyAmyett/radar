import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy aliases
        background: "var(--fl-color-bg-base)",
        foreground: "var(--fl-color-text-primary)",
        // Funnelists UI color system
        fl: {
          primary: {
            DEFAULT: "var(--fl-color-primary)",
            hover: "var(--fl-color-primary-hover)",
            active: "var(--fl-color-primary-active)",
          },
          bg: {
            base: "var(--fl-color-bg-base)",
            elevated: "var(--fl-color-bg-elevated)",
            surface: "var(--fl-color-bg-surface)",
            overlay: "var(--fl-color-bg-overlay)",
          },
          text: {
            primary: "var(--fl-color-text-primary)",
            secondary: "var(--fl-color-text-secondary)",
            muted: "var(--fl-color-text-muted)",
            inverse: "var(--fl-color-text-inverse)",
          },
          border: {
            DEFAULT: "var(--fl-color-border)",
            hover: "var(--fl-color-border-hover)",
            focus: "var(--fl-color-border-focus)",
          },
          success: "var(--fl-color-success)",
          warning: "var(--fl-color-warning)",
          error: "var(--fl-color-error)",
          info: "var(--fl-color-info)",
        },
        // Accent colors (cyan)
        accent: {
          DEFAULT: "var(--fl-color-primary)",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      fontFamily: {
        sans: ["var(--fl-font-family)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "fl-xs": "var(--fl-font-size-xs)",
        "fl-sm": "var(--fl-font-size-sm)",
        "fl-md": "var(--fl-font-size-md)",
        "fl-lg": "var(--fl-font-size-lg)",
        "fl-xl": "var(--fl-font-size-xl)",
        "fl-2xl": "var(--fl-font-size-2xl)",
      },
      spacing: {
        "fl-xs": "var(--fl-spacing-xs)",
        "fl-sm": "var(--fl-spacing-sm)",
        "fl-md": "var(--fl-spacing-md)",
        "fl-lg": "var(--fl-spacing-lg)",
        "fl-xl": "var(--fl-spacing-xl)",
        "fl-2xl": "var(--fl-spacing-2xl)",
      },
      borderRadius: {
        "fl-sm": "var(--fl-radius-sm)",
        "fl-md": "var(--fl-radius-md)",
        "fl-lg": "var(--fl-radius-lg)",
        "fl-xl": "var(--fl-radius-xl)",
        "fl-2xl": "var(--fl-radius-2xl)",
        "fl-full": "var(--fl-radius-full)",
      },
      boxShadow: {
        "fl-sm": "var(--fl-shadow-sm)",
        "fl-md": "var(--fl-shadow-md)",
        "fl-lg": "var(--fl-shadow-lg)",
        "fl-xl": "var(--fl-shadow-xl)",
      },
      transitionDuration: {
        "fl-fast": "150ms",
        "fl-normal": "200ms",
        "fl-slow": "300ms",
      },
      zIndex: {
        "fl-dropdown": "100",
        "fl-sticky": "200",
        "fl-fixed": "300",
        "fl-modal-backdrop": "400",
        "fl-modal": "500",
        "fl-popover": "600",
        "fl-tooltip": "700",
      },
      backdropBlur: {
        xs: "2px",
        fl: "var(--fl-glass-blur)",
      },
      backgroundColor: {
        glass: "var(--fl-glass-bg)",
        "glass-hover": "var(--fl-glass-bg-hover)",
        "glass-dark": "rgba(0, 0, 0, 0.3)",
      },
      borderColor: {
        glass: "var(--fl-glass-border)",
        "glass-hover": "var(--fl-glass-border-hover)",
      },
    },
  },
  plugins: [],
};
export default config;
