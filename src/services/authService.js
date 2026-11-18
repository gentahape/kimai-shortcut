import { request } from "./apiClient.js";
import { STORAGE_KEYS } from "../constants/presets.js";
import { getInitials } from "../utils/formatters.js";

/**
 * Log in to Kimai using API Bearer token.
 * Validates token against GET /users/me.
 *
 * @param {string} token
 * @returns {Promise<object>} User profile
 */
export async function login(token) {
    const cleanToken = (token || "").trim();
    if (!cleanToken) {
        throw new Error("Token cannot be empty!");
    }

    const userData = await request("/users/me", {
        method: "GET",
        token: cleanToken,
    });

    const essentialUser = {
        id: userData.id,
        username: userData.username,
        alias: userData.alias || userData.username,
        title: userData.title || "",
        avatar: userData.avatar || "",
        initials: getInitials(userData.alias || userData.username),
        "color-safe": userData["color-safe"] || userData.color || "#4F46E5",
    };

    localStorage.setItem(STORAGE_KEYS.TOKEN, cleanToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(essentialUser));

    return essentialUser;
}

/**
 * Log out and clear saved credentials.
 */
export function logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Retrieve saved user and token from storage.
 * @returns {{ token: string, user: object, isAuthenticated: boolean }}
 */
export function getCurrentSession() {
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN) || "";
    const savedUserStr = localStorage.getItem(STORAGE_KEYS.USER) || "";

    if (!savedToken || !savedUserStr) {
        return { token: "", user: null, isAuthenticated: false };
    }

    try {
        const user = JSON.parse(savedUserStr);
        if (!user.initials) {
            user.initials = getInitials(user.alias || user.username);
        }
        return { token: savedToken, user, isAuthenticated: true };
    } catch {
        logout();
        return { token: "", user: null, isAuthenticated: false };
    }
}

