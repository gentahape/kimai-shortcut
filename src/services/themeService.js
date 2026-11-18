import { STORAGE_KEYS } from "../constants/presets.js";

/**
 * Get current active theme ('dark' | 'light').
 * Defaults to 'light'.
 * @returns {"dark"|"light"}
 */
export function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === "dark" || saved === "light") {
        return saved;
    }
    return "light";
}

/**
 * Apply theme to document and persist preference.
 * @param {"dark"|"light"} theme
 */
export function applyTheme(theme) {
    const isDark = theme === "dark";
    if (isDark) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    window.dispatchEvent(new CustomEvent("kimai:theme-changed", { detail: { theme } }));
}

/**
 * Toggle between light and dark mode.
 * @returns {"dark"|"light"} New active theme
 */
export function toggleTheme() {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    const newTheme = isCurrentlyDark ? "light" : "dark";
    applyTheme(newTheme);
    return newTheme;
}

/**
 * Initialize theme based on user's saved preference or OS setting.
 */
export function initTheme() {
    const theme = getInitialTheme();
    applyTheme(theme);
}

