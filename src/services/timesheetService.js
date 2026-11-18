import { request } from "./apiClient.js";

/**
 * Fetch all timesheets for the current user.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getTimesheets(token) {
    const data = await request("/timesheets", {
        method: "GET",
        token,
    });
    return Array.isArray(data) ? data : [];
}

/**
 * Fetch a single timesheet record by ID.
 * @param {number|string} id
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function getTimesheet(id, token) {
    return await request(`/timesheets/${id}`, {
        method: "GET",
        token,
    });
}

/**
 * Create a new timesheet record.
 * Standard Kimai API accepts single object only.
 *
 * @param {object} payload - Timesheet payload
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function createTimesheet(payload, token) {
    return await request("/timesheets", {
        method: "POST",
        token,
        body: payload,
    });
}

/**
 * Update an existing timesheet record.
 * Uses PATCH /timesheets/{id}.
 *
 * @param {number|string} id
 * @param {object} payload
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function updateTimesheet(id, payload, token) {
    return await request(`/timesheets/${id}`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

/**
 * Delete a timesheet record by ID.
 * @param {number|string} id
 * @param {string} token
 * @returns {Promise<any>}
 */
export async function deleteTimesheet(id, token) {
    return await request(`/timesheets/${id}`, {
        method: "DELETE",
        token,
    });
}

