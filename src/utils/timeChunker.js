import { DURATION_PRESETS } from "../constants/presets.js";

/**
 * Resolve the chunk size in hours from a preset string.
 * @param {string} presetValue
 * @returns {number} Hours
 */
export function getChunkHoursFromPreset(presetValue) {
    const preset = DURATION_PRESETS.find((p) => p.value === presetValue);
    return preset ? preset.hours : 4;
}

/**
 * Calculate the end time (HH:MM) based on start time, duration in hours, and lunch break.
 *
 * @param {string} beginTime - Start time in "HH:MM" format
 * @param {number} durationHours - Duration in hours (e.g. 4, 2, 0.5)
 * @param {string} [lunchStart="12:00"] - Lunch start in "HH:MM"
 * @param {string} [lunchEnd="13:00"] - Lunch end in "HH:MM"
 * @returns {string} End time in "HH:MM" format
 */
export function calculateEndTime(
    beginTime,
    durationHours,
    lunchStart = "12:00",
    lunchEnd = "13:00"
) {
    if (!beginTime || !durationHours || durationHours <= 0) {
        return beginTime || "17:00";
    }

    const [bH, bM] = beginTime.split(":").map(Number);
    const [lsh, lsm] = (lunchStart || "12:00").split(":").map(Number);
    const [leh, lem] = (lunchEnd || "13:00").split(":").map(Number);

    const startMinutes = (isNaN(bH) ? 8 : bH) * 60 + (isNaN(bM) ? 0 : bM);
    const lunchStartMinutes = (isNaN(lsh) ? 12 : lsh) * 60 + (isNaN(lsm) ? 0 : lsm);
    const lunchEndMinutes = (isNaN(leh) ? 13 : leh) * 60 + (isNaN(lem) ? 0 : lem);

    const workMinutesToAdd = Math.round(durationHours * 60);

    let endMinutes = startMinutes;
    let remainingMinutes = workMinutesToAdd;

    // If starting inside lunch break, shift start to lunchEnd
    if (endMinutes >= lunchStartMinutes && endMinutes < lunchEndMinutes) {
        endMinutes = lunchEndMinutes;
    }

    // If before lunch, calculate whether work duration crosses lunch break
    if (endMinutes < lunchStartMinutes) {
        const availableBeforeLunch = lunchStartMinutes - endMinutes;
        if (remainingMinutes <= availableBeforeLunch) {
            endMinutes += remainingMinutes;
            remainingMinutes = 0;
        } else {
            remainingMinutes -= availableBeforeLunch;
            endMinutes = lunchEndMinutes + remainingMinutes;
            remainingMinutes = 0;
        }
    } else {
        // After lunch break
        endMinutes += remainingMinutes;
    }

    // Clamp to 23:59 if exceeds day
    if (endMinutes >= 24 * 60) {
        endMinutes = 23 * 60 + 59;
    }

    const h = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const m = (endMinutes % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

/**
 * Calculate display slots (e.g., ["08:00–12:00", "13:00–17:00"]) for a given time window.
 * Skips the configured lunch break.
 *
 * @param {object} params
 * @param {string} params.date - Date in YYYY-MM-DD format
 * @param {string} params.begin - Start time in HH:MM format
 * @param {string} params.end - End time in HH:MM format
 * @param {number} params.chunkHours - Chunk interval in hours
 * @param {string} params.lunchStart - Lunch start in HH:MM format
 * @param {string} params.lunchEnd - Lunch end in HH:MM format
 * @returns {string[]} List of slot string representations
 */
export function calculateTimeSlots({
    date,
    begin,
    end,
    chunkHours = 4,
    lunchStart = "12:00",
    lunchEnd = "13:00",
}) {
    if (!begin || !end) return [];
    const dateStr = date || "2000-01-01";
    const workStart = new Date(`${dateStr}T${begin}:00`);
    const workEnd = new Date(`${dateStr}T${end}:00`);
    if (workStart >= workEnd) return [];

    const lunchStartDate = new Date(`${dateStr}T${lunchStart}:00`);
    const lunchEndDate = new Date(`${dateStr}T${lunchEnd}:00`);

    const chunkMs = (chunkHours || 4) * 60 * 60 * 1000;
    let current = new Date(workStart);
    const finalEnd = new Date(workEnd);
    const slots = [];

    while (current < finalEnd) {
        if (current >= lunchStartDate && current < lunchEndDate) {
            current = new Date(lunchEndDate);
            continue;
        }

        let chunkEnd = new Date(current.getTime() + chunkMs);

        if (current < lunchStartDate && chunkEnd > lunchStartDate) {
            chunkEnd = new Date(lunchStartDate);
        }

        if (chunkEnd > finalEnd) {
            chunkEnd = new Date(finalEnd);
        }

        if (current.getTime() === chunkEnd.getTime()) break;

        const bStr = current.toTimeString().substring(0, 5);
        const eStr = chunkEnd.toTimeString().substring(0, 5);
        slots.push(`${bStr}–${eStr}`);

        current = new Date(chunkEnd);
    }

    return slots;
}

/**
 * Generate Kimai timesheet API payloads for a single form item.
 * Splits across chunk hours and skips lunch break.
 *
 * @param {object} form - Single form object
 * @param {object} workConfig - Work schedule configuration
 * @returns {Array<object>} Array of payload objects
 */
export function generateTimesheetPayloads(form, workConfig) {
    const dateStr = form.date;
    const workStart = new Date(`${dateStr}T${form.begin}:00`);
    const workEnd = new Date(`${dateStr}T${form.end}:00`);

    if (workStart >= workEnd) {
        throw new Error("Start time must be before end time.");
    }

    const chunkHours = getChunkHoursFromPreset(form.durationPreset);
    if (!chunkHours || chunkHours <= 0) {
        throw new Error("Duration preset tidak valid.");
    }

    if (chunkHours > 4) {
        throw new Error("Durasi per task di Kimai tidak boleh lebih dari 4 jam (maksimal 4 jam).");
    }

    const lunchStart = new Date(`${dateStr}T${workConfig.lunchStart}:00`);
    const lunchEnd = new Date(`${dateStr}T${workConfig.lunchEnd}:00`);

    let current = new Date(workStart);
    const finalEnd = new Date(workEnd);
    const payloads = [];

    const tagsString = Array.isArray(form.tags) && form.tags.length > 0
        ? form.tags.join(", ")
        : (typeof form.tags === "string" ? form.tags : "");

    const chunkMs = chunkHours * 60 * 60 * 1000;

    while (current < finalEnd) {
        if (current >= lunchStart && current < lunchEnd) {
            current = new Date(lunchEnd);
            continue;
        }

        let chunkEnd = new Date(current.getTime() + chunkMs);

        if (current < lunchStart && chunkEnd > lunchStart) {
            chunkEnd = new Date(lunchStart);
        }

        if (chunkEnd > finalEnd) {
            chunkEnd = new Date(finalEnd);
        }

        if (current.getTime() === chunkEnd.getTime()) break;

        const payload = {
            begin: current.toISOString(),
            end: chunkEnd.toISOString(),
            project: parseInt(form.project, 10),
            activity: parseInt(form.activity, 10),
            description: form.description,
        };

        if (tagsString) {
            payload.tags = tagsString;
        }

        payloads.push({
            displaySlot: `${current.toTimeString().substring(0, 5)}–${chunkEnd.toTimeString().substring(0, 5)}`,
            payload,
        });

        current = new Date(chunkEnd);
    }

    if (payloads.length === 0) {
        throw new Error("Tidak ada interval jam kerja yang valid untuk dikirim.");
    }

    return payloads;
}

