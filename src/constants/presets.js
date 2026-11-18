/**
 * Duration presets for work chunk splitting.
 */
export const DURATION_PRESETS = [
    { value: "4h", label: "4 Jam (Default)", hours: 4 },
    { value: "3.5h", label: "3.5 Jam", hours: 3.5 },
    { value: "3h", label: "3 Jam", hours: 3 },
    { value: "2.5h", label: "2.5 Jam", hours: 2.5 },
    { value: "2h", label: "2 Jam", hours: 2 },
    { value: "1.5h", label: "1.5 Jam", hours: 1.5 },
    { value: "1h", label: "1 Jam", hours: 1 },
    { value: "30m", label: "30 Menit", hours: 0.5 },
];

/**
 * Storage keys used in localStorage / sessionStorage.
 */
export const STORAGE_KEYS = {
    TOKEN: "kimai_token",
    USER: "kimai_user",
    THEME: "kimai_theme",
};

/**
 * Get work schedule configuration from environment variables with sensible defaults.
 * @returns {object} Work schedule settings.
 */
export function getWorkConfig() {
    return {
        startTime: import.meta.env.VITE_WORK_START_TIME || "08:00",
        endTime: import.meta.env.VITE_WORK_END_TIME || "17:00",
        lunchStart: import.meta.env.VITE_LUNCH_START || "12:00",
        lunchEnd: import.meta.env.VITE_LUNCH_END || "13:00",
        chunkHours: Number(import.meta.env.VITE_CHUNK_HOURS) || 4,
        get expectedWorkHours() {
            const [sh, sm] = this.startTime.split(":").map(Number);
            const [eh, em] = this.endTime.split(":").map(Number);
            const [lh, lm] = this.lunchStart.split(":").map(Number);
            const [leH, leM] = this.lunchEnd.split(":").map(Number);
            const totalMin = (eh * 60 + em) - (sh * 60 + sm);
            const lunchMin = (leH * 60 + leM) - (lh * 60 + lm);
            return (totalMin - lunchMin) / 60;
        },
    };
}

