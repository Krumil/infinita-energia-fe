/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Roboto Slab"', "Georgia", "serif"],
                mono: ['"IBM Plex Mono"', "Consolas", "monospace"],
                body: ['"Roboto"', "system-ui", "sans-serif"],
            },
            colors: {
                // Infinita Energia brand palette
                "energia-primary": {
                    DEFAULT: "hsl(var(--energia-primary) / <alpha-value>)",
                    light: "hsl(var(--energia-primary-light) / <alpha-value>)",
                    dark: "hsl(var(--energia-primary-dark) / <alpha-value>)",
                },
                "energia-accent": {
                    DEFAULT: "hsl(var(--energia-accent) / <alpha-value>)",
                    light: "hsl(var(--energia-accent-light) / <alpha-value>)",
                    dark: "hsl(var(--energia-accent-dark) / <alpha-value>)",
                },
                "energia-secondary": {
                    DEFAULT: "hsl(var(--energia-secondary) / <alpha-value>)",
                    light: "hsl(var(--energia-secondary) / <alpha-value>)",
                },
                "energia-text": {
                    DEFAULT: "hsl(var(--energia-text) / <alpha-value>)",
                },
                sage: {
                    DEFAULT: "hsl(var(--sage) / <alpha-value>)",
                    light: "hsl(var(--sage-light) / <alpha-value>)",
                },
                // Keep shadcn compatibility
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
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            animation: {
                "fade-up": "fadeUp 0.6s ease-out forwards",
                "fade-in": "fadeIn 0.4s ease-out forwards",
                "slide-in": "slideIn 0.5s ease-out forwards",
                "number-roll": "numberRoll 0.8s ease-out forwards",
                "pulse-soft": "pulseSoft 2s ease-in-out infinite",
            },
            keyframes: {
                fadeUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideIn: {
                    "0%": { opacity: "0", transform: "translateX(-10px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                numberRoll: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
            },
        },
    },
    plugins: [],
};
