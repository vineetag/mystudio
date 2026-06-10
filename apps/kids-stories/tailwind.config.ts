import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultTheme"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  prefix: "",
  // Theme-accent utilities are composed dynamically (e.g. `bg-theme-${theme}-bg`),
  // so the JIT scanner can't see them in source — keep them from being purged.
  safelist: [
    {
      pattern:
        /(bg|text|border)-theme-(kindness|honesty|courage|family|friendship|challenges|wonder|nature|growth)-(bg|text)/,
    },
  ],
  // ^ border-theme-*-text is used by ThemePicker claymorphism borders
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ZippyTales brand tokens (from approved designs)
        "brand-purple": {
          DEFAULT: "#7F77DD",
          light: "#EEEDFE",
        },
        "brand-teal": "#5DCAA5",
        parchment: "#F7F4EE",
        ink: {
          DEFAULT: "#2C2C2A",
          muted: "#888780",
        },

        // Theme accents (story categories) — { bg, text } per theme
        theme: {
          // Core Moral & Behavioral
          kindness:   { bg: "#FFF9E6", text: "#A05F00" },
          honesty:    { bg: "#E6F4FF", text: "#1A5FA0" },
          courage:    { bg: "#FFF0E6", text: "#A04020" },
          // Social & Emotional
          family:     { bg: "#FFE8EF", text: "#A02050" },
          friendship: { bg: "#E8F4FF", text: "#1A5890" },
          challenges: { bg: "#E6F7ED", text: "#1B6B3A" },
          // Imagination & Exploration
          wonder:     { bg: "#F0E6FF", text: "#5A2A9E" },
          nature:     { bg: "#E8F5E8", text: "#2A6B2A" },
          growth:     { bg: "#FFF4E0", text: "#8B5E00" },
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-lora)", ...defaultTheme.fontFamily.serif],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // ZippyTales radii
        pill: "50px",
        card: "16px",
        input: "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out both",
        float: "float 3s ease-in-out infinite",
        "float-slow": "float 4.5s ease-in-out infinite",
        "float-fast": "float 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
