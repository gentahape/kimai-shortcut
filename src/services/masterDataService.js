import { request } from "./apiClient.js";

/**
 * Fetch all master data dropdown items in parallel.
 *
 * @param {string} token - Kimai API token
 * @returns {Promise<{ customers: Array, projects: Array, activities: Array, availableTags: Array }>}
 */
export async function fetchMasterData(token) {
    const [rawCustomers, rawProjects, rawActivities, rawTags] = await Promise.all([
        request("/customers", { token }).catch((err) => {
            console.warn("Failed to load customers:", err);
            return [];
        }),
        request("/projects", { token }).catch((err) => {
            console.warn("Failed to load projects:", err);
            return [];
        }),
        request("/activities", { token }).catch((err) => {
            console.warn("Failed to load activities:", err);
            return [];
        }),
        request("/tags", { token }).catch((err) => {
            console.warn("Failed to load tags:", err);
            return [];
        }),
    ]);

    const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

    const projects = Array.isArray(rawProjects)
        ? rawProjects.map((p) => ({
              id: p.id,
              name: p.parentTitle ? `${p.parentTitle} | ${p.name}` : p.name,
              customer: p.customer,
          }))
        : [];

    const activities = Array.isArray(rawActivities) ? rawActivities : [];

    const availableTags = Array.isArray(rawTags)
        ? rawTags.map((t) => (typeof t === "string" ? t : t.name || String(t)))
        : [];

    return {
        customers,
        projects,
        activities,
        availableTags,
    };
}

