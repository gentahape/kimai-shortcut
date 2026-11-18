/**
 * Centralized API client for communicating with the Kimai REST API.
 */

/**
 * Get Kimai API base URL dynamically.
 * @returns {string}
 */
export function getApiBaseUrl() {
    return import.meta.env.VITE_KIMAI_API_URL || "";
}

/**
 * Execute an HTTP request against the Kimai API.
 *
 * @param {string} endpoint - Path relative to base URL (e.g. '/timesheets')
 * @param {object} options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {string} [options.token=''] - API Bearer token
 * @param {object|null} [options.body=null] - Request body (will be JSON stringified)
 * @param {object} [options.headers={}] - Extra headers
 * @returns {Promise<any>}
 */
export async function request(endpoint, {
    method = "GET",
    token = "",
    body = null,
    headers = {},
} = {}) {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
        throw new Error("Kimai API URL is not configured. Please check VITE_KIMAI_API_URL in .env");
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

    const requestHeaders = {
        Accept: "application/json",
        ...headers,
    };

    if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
    }

    const config = {
        method,
        headers: requestHeaders,
    };

    if (body !== null && body !== undefined) {
        requestHeaders["Content-Type"] = "application/json";
        config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("kimai:session-expired"));
        throw new Error("Sesi berakhir atau token tidak valid. Silakan login kembali.");
    }

    // Try parsing JSON response
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        // Parse Kimai-specific validation errors
        if (response.status === 400 && data?.errors?.errors) {
            const errorList = Array.isArray(data.errors.errors)
                ? data.errors.errors.join("<br> • ")
                : String(data.errors.errors);
            const err = new Error(`Validation Error:<br> • ${errorList}`);
            err.status = 400;
            err.errors = data.errors.errors;
            throw err;
        }

        const message = data?.message || `Server error (${response.status}: ${response.statusText})`;
        const err = new Error(message);
        err.status = response.status;
        err.data = data;
        throw err;
    }

    return data;
}

