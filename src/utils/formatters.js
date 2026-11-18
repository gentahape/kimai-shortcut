/**
 * Format an ISO date/time string to a localized date.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(0, 10);
        return date.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return isoString.substring(0, 10);
    }
}

/**
 * Format an ISO date string into a local HH:mm string.
 * @param {string} isoString
 * @returns {string}
 */
export function formatTime(isoString) {
    if (!isoString) return "-";
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString.substring(11, 16);
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    } catch {
        return isoString.substring(11, 16);
    }
}

/**
 * Format duration in seconds to a human-readable string (e.g. 4h, 2h 30m).
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds) || seconds < 0) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0 && minutes === 0) return "0m";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

/**
 * Generate user initials from username or alias.
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

