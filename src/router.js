/**
 * Lightweight client-side hash router.
 */

/**
 * Parse the current window.location.hash.
 * @param {string} hash
 * @returns {{ view: 'list'|'add'|'edit', id: string|null }}
 */
export function parseHash(hash = window.location.hash) {
    const cleanHash = (hash || "").replace(/^#\/?/, "");

    if (cleanHash.startsWith("edit/")) {
        const id = cleanHash.split("/")[1] || null;
        return { view: "edit", id };
    }

    if (cleanHash === "add") {
        return { view: "add", id: null };
    }

    return { view: "list", id: null };
}

/**
 * Navigate to a given route by hash.
 * @param {string} route - e.g. '#/', '#/add', '#/edit/123'
 */
export function navigate(route) {
    const targetHash = route.startsWith("#") ? route : `#/${route.replace(/^\/+/, "")}`;
    if (window.location.hash === targetHash) {
        // Trigger manual route change event if hash is identical
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
        window.location.hash = targetHash;
    }
}

