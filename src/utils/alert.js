import Swal from "sweetalert2";

/**
 * Check if the document is currently in dark mode.
 * @returns {boolean}
 */
export function isDarkMode() {
    return document.documentElement.classList.contains("dark");
}

/**
 * Get SweetAlert2 theme colors based on current mode.
 * @returns {object}
 */
function getThemeOptions() {
    const dark = isDarkMode();
    return {
        background: dark ? "#1F2937" : "#FFFFFF",
        color: dark ? "#F9FAFB" : "#111827",
        customClass: {
            popup: dark ? "border border-gray-700 shadow-2xl" : "border border-gray-200 shadow-xl",
            title: dark ? "text-gray-100" : "text-gray-900",
            htmlContainer: dark ? "text-gray-300" : "text-gray-600",
        },
    };
}

/**
 * Show a standard alert popup.
 * @param {string} title
 * @param {string} text
 * @param {"success"|"error"|"warning"|"info"|"question"} icon
 */
export function showAlert(title, text, icon = "info") {
    const theme = getThemeOptions();
    return Swal.fire({
        title,
        text,
        icon,
        ...theme,
        confirmButtonColor:
            icon === "error" || icon === "warning" ? "#DC2626" : "#2563EB",
    });
}

/**
 * Show a success notification alert.
 * @param {string} title
 * @param {string} text
 * @param {number} timer
 */
export function showSuccess(title, text = "", timer = 2500) {
    const theme = getThemeOptions();
    return Swal.fire({
        title,
        text,
        icon: "success",
        ...theme,
        showConfirmButton: timer ? false : true,
        timer: timer || undefined,
        confirmButtonColor: "#059669",
    });
}

/**
 * Show an error alert with HTML or text.
 * @param {string} title
 * @param {string} message
 * @param {boolean} isHtml
 */
export function showError(title, message, isHtml = false) {
    const theme = getThemeOptions();
    const contentKey = isHtml ? "html" : "text";
    return Swal.fire({
        title,
        [contentKey]: message,
        icon: "error",
        ...theme,
        confirmButtonColor: "#DC2626",
    });
}

/**
 * Show a warning alert.
 * @param {string} title
 * @param {string} text
 */
export function showWarning(title, text) {
    return showAlert(title, text, "warning");
}

/**
 * Show a blocking loading modal.
 * @param {string} title
 * @param {string} text
 */
export function showLoading(title = "Processing...", text = "Please wait...") {
    const theme = getThemeOptions();
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        ...theme,
        didOpen: () => {
            Swal.showLoading();
        },
    });
}

/**
 * Update the loading modal text dynamically (useful for sequential progress).
 * @param {string} title
 * @param {string} text
 */
export function updateLoadingText(title, text) {
    if (Swal.isVisible()) {
        const titleEl = Swal.getTitle();
        const htmlEl = Swal.getHtmlContainer();
        if (titleEl && title) titleEl.innerText = title;
        if (htmlEl && text) htmlEl.innerText = text;
    }
}

/**
 * Close any active SweetAlert modal.
 */
export function closeAlert() {
    Swal.close();
}

/**
 * Show a confirmation dialog.
 * @param {string} title
 * @param {string} text
 * @param {string} confirmButtonText
 * @param {"warning"|"question"|"info"} icon
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
 */
export async function showConfirm(
    title,
    text,
    confirmButtonText = "Ya, lanjutkan",
    icon = "warning"
) {
    const theme = getThemeOptions();
    const result = await Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonColor: icon === "warning" ? "#DC2626" : "#2563EB",
        cancelButtonColor: "#6B7280",
        confirmButtonText,
        cancelButtonText: "Batal",
        reverseButtons: true,
        ...theme,
    });
    return result.isConfirmed;
}

