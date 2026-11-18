import { DURATION_PRESETS, getWorkConfig } from "./constants/presets.js";
import { getCurrentSession, login as authLogin, logout as authLogout } from "./services/authService.js";
import { fetchMasterData } from "./services/masterDataService.js";
import { getTimesheets, getTimesheet, createTimesheet, updateTimesheet, deleteTimesheet } from "./services/timesheetService.js";
import { getInitialTheme, toggleTheme as svcToggleTheme } from "./services/themeService.js";
import { parseHash, navigate as routerNavigate } from "./router.js";
import {
    showSuccess,
    showError,
    showWarning,
    showLoading,
    updateLoadingText,
    closeAlert,
    showConfirm,
} from "./utils/alert.js";
import { calculateTimeSlots, generateTimesheetPayloads, getChunkHoursFromPreset, calculateEndTime } from "./utils/timeChunker.js";
import { formatDuration } from "./utils/formatters.js";

export default () => ({
    // Auth & User State
    token: "",
    isAuthenticated: false,
    isLoadingAuth: false,
    user: {},

    // Theme ('dark' | 'light')
    theme: getInitialTheme(),

    // Router State
    currentRoute: { view: "list", id: null },

    // Master Data
    customers: [],
    projects: [],
    activities: [],
    availableTags: [],
    isLoadingMasterData: false,

    // Timesheets List State
    timesheets: [],
    isLoadingTimesheets: false,
    searchQuery: "",
    currentPage: 1,
    itemsPerPage: 10,

    // Add Page State (Dynamic Multiple Forms)
    addForms: [],
    isSubmittingAdd: false,

    // Edit Page State (Single Form)
    editForm: {
        id: null,
        date: "",
        begin: "",
        end: "",
        customer: "",
        project: "",
        activity: "",
        description: "",
        tags: [],
    },
    isLoadingEdit: false,
    isSubmittingEdit: false,

    // Constants & Configurations
    durationPresets: DURATION_PRESETS,
    get workConfig() {
        return getWorkConfig();
    },

    /**
     * Cache for loaded partial templates.
     */
    _partialCache: {},

    /**
     * Load an HTML partial template with caching.
     * @param {string} url
     * @returns {Promise<string>}
     */
    async loadPartial(url) {
        if (this._partialCache[url]) {
            return this._partialCache[url];
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Gagal memuat template: ${url}`);
            const html = await response.text();
            this._partialCache[url] = html;
            return html;
        } catch (error) {
            console.error(error);
            return `<div class="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg">Error loading component ${url}</div>`;
        }
    },

    /**
     * Component Lifecycle Init.
     */
    init() {
        this.checkSession();

        // Listen for unauthorized session expiration events from API client
        window.addEventListener("kimai:session-expired", () => {
            this.logout();
            showError("Sesi Berakhir", "Token API Anda tidak valid atau telah kedaluwarsa. Silakan sign in kembali.");
        });

        // Setup Hash Change Listener
        window.addEventListener("hashchange", () => {
            this.handleRouteChange();
        });

        // Initialize Route based on current hash
        this.handleRouteChange();

        // Reset pagination when searching
        this.$watch("searchQuery", () => {
            this.currentPage = 1;
        });

        if (this.isAuthenticated) {
            this.loadInitialData();
        }
    },

    /**
     * Handle Hash-based Route changes.
     */
    handleRouteChange() {
        const route = parseHash();
        this.currentRoute = route;

        if (route.view === "add") {
            if (this.addForms.length === 0) {
                this.initAddForm();
            }
        } else if (route.view === "edit") {
            if (route.id) {
                this.loadEditTimesheet(route.id);
            } else {
                this.navigate("");
            }
        }
    },

    /**
     * Navigate to a route hash.
     * @param {string} path - e.g. '', 'add', 'edit/123'
     */
    navigate(path) {
        routerNavigate(path);
    },

    /**
     * Toggle Light/Dark mode.
     */
    toggleTheme() {
        this.theme = svcToggleTheme();
    },

    /**
     * Check if a valid session exists in storage.
     */
    checkSession() {
        const session = getCurrentSession();
        this.token = session.token;
        this.user = session.user || {};
        this.isAuthenticated = session.isAuthenticated;
    },

    /**
     * Load Master Data & Timesheets together.
     */
    async loadInitialData() {
        await Promise.all([
            this.fetchMasterData(),
            this.fetchTimesheets(),
        ]);
    },

    /**
     * Log in using API Bearer Token.
     */
    async login() {
        if (!this.token.trim()) {
            showWarning("Akses Ditolak", "Token tidak boleh kosong!");
            return;
        }

        this.isLoadingAuth = true;
        try {
            const user = await authLogin(this.token);
            this.user = user;
            this.isAuthenticated = true;

            showSuccess("Sign In Berhasil", `Selamat datang kembali, ${user.alias || user.username}!`, 2000);

            await this.loadInitialData();
        } catch (error) {
            showError("Autentikasi Gagal", error.message);
        } finally {
            this.isLoadingAuth = false;
        }
    },

    /**
     * Log out and reset app state.
     */
    logout() {
        authLogout();
        this.token = "";
        this.user = {};
        this.isAuthenticated = false;
        this.customers = [];
        this.projects = [];
        this.activities = [];
        this.availableTags = [];
        this.timesheets = [];
        this.searchQuery = "";
        this.addForms = [];
        this.navigate("");
    },

    /**
     * Fetch master data options for dropdowns.
     */
    async fetchMasterData() {
        if (!this.token) return;
        this.isLoadingMasterData = true;
        try {
            const data = await fetchMasterData(this.token);
            this.customers = data.customers;
            this.projects = data.projects;
            this.activities = data.activities;
            this.availableTags = data.availableTags;
        } catch (error) {
            console.error("Master data error:", error);
        } finally {
            this.isLoadingMasterData = false;
        }
    },

    /**
     * Fetch timesheets for list view.
     */
    async fetchTimesheets() {
        if (!this.token) return;
        this.isLoadingTimesheets = true;
        try {
            const data = await getTimesheets(this.token);
            this.timesheets = data;
        } catch (error) {
            showError("Gagal Memuat Timesheet", error.message);
        } finally {
            this.isLoadingTimesheets = false;
        }
    },

    /**
     * Format project name with fallback.
     */
    getProjectName(projectRef) {
        if (!projectRef) return "-";
        if (typeof projectRef === "object" && projectRef.name) {
            return projectRef.parentTitle
                ? `${projectRef.parentTitle} | ${projectRef.name}`
                : projectRef.name;
        }
        const found = this.projects.find((p) => String(p.id) === String(projectRef));
        return found ? found.name : `Project #${projectRef}`;
    },

    /**
     * Format activity name with fallback.
     */
    getActivityName(activityRef) {
        if (!activityRef) return "-";
        if (typeof activityRef === "object" && activityRef.name) {
            return activityRef.name;
        }
        const found = this.activities.find((a) => String(a.id) === String(activityRef));
        return found ? found.name : `Activity #${activityRef}`;
    },

    /**
     * Format duration seconds to human-readable string.
     */
    getFormattedDuration(seconds) {
        return formatDuration(seconds);
    },

    /**
     * Delete a timesheet record with confirmation.
     * @param {number|string} id
     */
    async deleteTimesheetRecord(id) {
        const confirmed = await showConfirm(
            "Hapus Catatan Timesheet?",
            "Data timesheet yang dihapus tidak dapat dipulihkan kembali.",
            "Ya, Hapus Data",
            "warning"
        );
        if (!confirmed) return;

        showLoading("Menghapus...", "Sedang menghapus catatan timesheet...");
        try {
            await deleteTimesheet(id, this.token);
            closeAlert();
            showSuccess("Berhasil Dihapus", "Catatan timesheet telah dihapus.", 2000);
            this.fetchTimesheets();
        } catch (error) {
            closeAlert();
            showError("Gagal Menghapus", error.message);
        }
    },

    // --- Timesheets List Computed & Pagination ---

    get filteredTimesheets() {
        if (!this.searchQuery.trim()) return this.timesheets;
        const q = this.searchQuery.toLowerCase().trim();
        return this.timesheets.filter((row) => {
            const desc = (row.description || "").toLowerCase();
            const dateStr = (row.begin || "").toLowerCase();
            const projName = this.getProjectName(row.project).toLowerCase();
            const actName = this.getActivityName(row.activity).toLowerCase();
            const tags = Array.isArray(row.tags) ? row.tags.join(" ").toLowerCase() : "";

            return (
                desc.includes(q) ||
                dateStr.includes(q) ||
                projName.includes(q) ||
                actName.includes(q) ||
                tags.includes(q)
            );
        });
    },

    get totalPages() {
        return Math.ceil(this.filteredTimesheets.length / this.itemsPerPage) || 1;
    },

    get paginatedTimesheets() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredTimesheets.slice(start, end);
    },

    get visiblePages() {
        let pages = [];
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(this.totalPages, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    },

    nextPage() {
        if (this.currentPage < this.totalPages) this.currentPage++;
    },

    prevPage() {
        if (this.currentPage > 1) this.currentPage--;
    },

    goToPage(page) {
        this.currentPage = page;
    },

    // --- Add Page (Dynamic Multiple Forms) Methods ---

    /**
     * Create an empty form item object with sensible defaults.
     * @param {object} [preset={}]
     * @returns {object}
     */
    createEmptyForm(preset = {}) {
        const begin = preset.begin || this.workConfig.startTime;
        const durationPreset = preset.durationPreset || "4h";
        const chunkHours = getChunkHoursFromPreset(durationPreset);
        const calculatedEnd = calculateEndTime(
            begin,
            chunkHours,
            this.workConfig.lunchStart,
            this.workConfig.lunchEnd
        );

        return {
            _id: "form_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
            date: preset.date || new Date().toISOString().split("T")[0],
            begin: begin,
            end: preset.end || calculatedEnd,
            durationPreset: durationPreset,
            customer: preset.customer || "",
            project: preset.project || "",
            activity: preset.activity || "",
            description: preset.description || "",
            tags: preset.tags ? [...preset.tags] : [],
        };
    },

    /**
     * Handle duration preset change: automatically adjust end time.
     * @param {object} form
     */
    onFormPresetChange(form) {
        if (!form) return;
        const hours = getChunkHoursFromPreset(form.durationPreset);
        form.end = calculateEndTime(
            form.begin,
            hours,
            this.workConfig.lunchStart,
            this.workConfig.lunchEnd
        );
    },

    /**
     * Handle start time change: automatically adjust end time based on selected preset.
     * @param {object} form
     */
    onFormBeginChange(form) {
        if (!form || !form.durationPreset) return;
        const hours = getChunkHoursFromPreset(form.durationPreset);
        form.end = calculateEndTime(
            form.begin,
            hours,
            this.workConfig.lunchStart,
            this.workConfig.lunchEnd
        );
    },

    /**
     * Initialize Add Page with at least 1 empty form.
     */
    initAddForm() {
        this.addForms = [this.createEmptyForm()];
    },

    /**
     * Add another form entry to the dynamic forms array.
     */
    addAnotherForm() {
        // Inherit date and customer/project from previous form as convenience if available
        const lastForm = this.addForms[this.addForms.length - 1];
        const newForm = this.createEmptyForm({
            date: lastForm?.date,
            customer: lastForm?.customer,
            project: lastForm?.project,
        });
        this.addForms.push(newForm);
    },

    /**
     * Remove a form entry by index.
     * @param {number} index
     */
    removeForm(index) {
        if (this.addForms.length <= 1) return;
        this.addForms.splice(index, 1);
    },

    /**
     * Duplicate a form entry by index.
     * @param {number} index
     */
    duplicateForm(index) {
        const source = this.addForms[index];
        if (!source) return;
        const cloned = {
            ...this.createEmptyForm(source),
            description: source.description,
            tags: [...source.tags],
            durationPreset: source.durationPreset,
            activity: source.activity,
        };
        this.addForms.splice(index + 1, 0, cloned);
    },

    /**
     * Calculate display slots for a specific form item.
     * @param {object} form
     * @returns {string[]}
     */
    getFormSlots(form) {
        return calculateTimeSlots({
            date: form.date,
            begin: form.begin,
            end: form.end,
            chunkHours: getChunkHoursFromPreset(form.durationPreset),
            lunchStart: this.workConfig.lunchStart,
            lunchEnd: this.workConfig.lunchEnd,
        });
    },

    /**
     * Total estimated chunk records across all active forms.
     * @returns {number}
     */
    getTotalEstimatedChunks() {
        return this.addForms.reduce((sum, f) => sum + this.getFormSlots(f).length, 0);
    },

    /**
     * Submit all dynamic forms sequentially.
     * Prioritas Utama: Kimai API creates 1 timesheet per request.
     * We validate all forms first, generate chunk payloads, then loop asynchronously
     * with detailed progress tracking and error resilience.
     */
    async submitAllForms() {
        if (this.addForms.length === 0) {
            showWarning("Form Kosong", "Silakan tambahkan setidaknya satu form timesheet.");
            return;
        }

        // --- Step 1: Validate all forms ---
        for (let i = 0; i < this.addForms.length; i++) {
            const form = this.addForms[i];
            const formNumber = i + 1;

            if (!form.project || !form.activity || !form.description.trim()) {
                showWarning(
                    "Validasi Gagal",
                    `Form #${formNumber} belum lengkap. Pastikan Project, Activity, dan Description telah diisi.`
                );
                return;
            }

            if (!form.date || !form.begin || !form.end) {
                showWarning(
                    "Validasi Gagal",
                    `Form #${formNumber} memiliki tanggal atau jam kerja yang belum diisi.`
                );
                return;
            }

            const workStart = new Date(`${form.date}T${form.begin}:00`);
            const workEnd = new Date(`${form.date}T${form.end}:00`);
            if (workStart >= workEnd) {
                showWarning(
                    "Validasi Jam Kerja",
                    `Form #${formNumber}: Waktu mulai (${form.begin}) harus lebih awal dari waktu selesai (${form.end}).`
                );
                return;
            }

            const chunkHours = getChunkHoursFromPreset(form.durationPreset);
            if (chunkHours > 4) {
                showWarning(
                    "Validasi Durasi",
                    `Form #${formNumber}: Durasi per task di Kimai maksimal 4 jam.`
                );
                return;
            }

            const slots = this.getFormSlots(form);
            if (slots.length === 0) {
                showWarning(
                    "Interval Tidak Valid",
                    `Form #${formNumber}: Tidak ada interval jam kerja yang valid untuk dikirim (mungkin bertepatan dengan jam istirahat).`
                );
                return;
            }
        }

        // --- Step 2: Generate All Payloads ---
        const allTasks = [];
        try {
            for (let i = 0; i < this.addForms.length; i++) {
                const form = this.addForms[i];
                const chunks = generateTimesheetPayloads(form, this.workConfig);
                for (const chunk of chunks) {
                    allTasks.push({
                        formIndex: i,
                        formNumber: i + 1,
                        displaySlot: chunk.displaySlot,
                        payload: chunk.payload,
                    });
                }
            }
        } catch (genError) {
            showError("Kesalahan Payload", genError.message);
            return;
        }

        if (allTasks.length === 0) {
            showWarning("Tidak Ada Data", "Tidak ada interval jam kerja yang valid untuk dikirim.");
            return;
        }

        // --- Step 3: Sequential Asynchronous Submission Loop ---
        this.isSubmittingAdd = true;
        showLoading(
            "Menyimpan Timesheet...",
            `Mempersiapkan pengiriman ${allTasks.length} catatan timesheet...`
        );

        let successCount = 0;
        const failedFormIndices = new Set();
        const errorDetails = [];

        try {
            for (let i = 0; i < allTasks.length; i++) {
                const task = allTasks[i];
                const currentStep = i + 1;

                updateLoadingText(
                    "Menyimpan Timesheet...",
                    `Menyimpan data ${currentStep} dari ${allTasks.length} [Form #${task.formNumber} (${task.displaySlot})]...`
                );

                try {
                    await createTimesheet(task.payload, this.token);
                    successCount++;
                } catch (err) {
                    console.error("Failed to save chunk:", task, err);
                    failedFormIndices.add(task.formIndex);
                    errorDetails.push(`Form #${task.formNumber} [${task.displaySlot}]: ${err.message}`);
                }
            }

            closeAlert();

            // --- Step 4: Handle Results & Feedback ---
            if (failedFormIndices.size === 0) {
                // Total Success!
                await showSuccess(
                    "Penyimpanan Berhasil!",
                    `Semua ${successCount} catatan timesheet berhasil disimpan ke Kimai.`,
                    3000
                );
                // Reset add forms to 1 clean form
                this.initAddForm();
                // Refresh list and navigate back
                this.fetchTimesheets();
                this.navigate("");
            } else {
                // Partial or Complete Failure
                // Keep only the failed forms so user doesn't lose their input
                this.addForms = this.addForms.filter((_, idx) => failedFormIndices.has(idx));

                const summaryHtml = `
                    <div class="text-left text-sm space-y-2 mt-2">
                        <p class="text-gray-300">
                            Berhasil disimpan: <strong class="text-emerald-400">${successCount}</strong> record.<br>
                            Gagal disimpan: <strong class="text-red-400">${failedFormIndices.size}</strong> form.
                        </p>
                        <div class="p-2.5 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-200 max-h-48 overflow-y-auto">
                            <strong>Detail Kesalahan:</strong><br>
                            &bull; ${errorDetails.join("<br>&bull; ")}
                        </div>
                        <p class="text-xs text-gray-400 mt-2">
                            Form yang gagal tetap dipertahankan pada halaman agar Anda dapat memeriksa dan memperbaikinya.
                        </p>
                    </div>
                `;

                showError("Sebagian / Seluruh Data Gagal Disimpan", summaryHtml, true);

                if (successCount > 0) {
                    this.fetchTimesheets();
                }
            }
        } finally {
            this.isSubmittingAdd = false;
        }
    },

    // --- Edit Page (Single Form) Methods ---

    /**
     * Load an existing timesheet record for editing.
     * @param {number|string} id
     */
    async loadEditTimesheet(id) {
        this.isLoadingEdit = true;
        try {
            let data = null;
            // First check if already in loaded timesheets array
            const existing = this.timesheets.find((t) => String(t.id) === String(id));
            if (existing) {
                data = existing;
            } else {
                data = await getTimesheet(id, this.token);
            }

            if (!data) throw new Error("Data timesheet tidak ditemukan.");

            const dateStr = data.begin ? data.begin.substring(0, 10) : new Date().toISOString().split("T")[0];
            const beginStr = data.begin ? data.begin.substring(11, 16) : "08:00";
            const endStr = data.end ? data.end.substring(11, 16) : "12:00";

            let tagsList = [];
            if (Array.isArray(data.tags)) {
                tagsList = data.tags.map((t) => (typeof t === "string" ? t : t.name || String(t)));
            } else if (typeof data.tags === "string" && data.tags.trim()) {
                tagsList = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
            }

            const projectId = typeof data.project === "object" ? data.project?.id : data.project;
            const activityId = typeof data.activity === "object" ? data.activity?.id : data.activity;

            // Resolve customer from project if available
            let customerId = "";
            if (typeof data.project === "object" && data.project?.customer) {
                customerId = typeof data.project.customer === "object" ? data.project.customer.id : data.project.customer;
            } else if (projectId) {
                const foundProj = this.projects.find((p) => String(p.id) === String(projectId));
                if (foundProj?.customer) {
                    customerId = foundProj.customer;
                }
            }

            this.editForm = {
                id: data.id,
                date: dateStr,
                begin: beginStr,
                end: endStr,
                customer: customerId,
                project: projectId || "",
                activity: activityId || "",
                description: data.description || "",
                tags: tagsList,
            };
        } catch (error) {
            showError("Gagal Memuat Data", error.message);
            this.navigate("");
        } finally {
            this.isLoadingEdit = false;
        }
    },

    /**
     * Submit Edit Form (Single timesheet update via PATCH /timesheets/{id}).
     */
    async submitEditForm() {
        if (!this.editForm.project || !this.editForm.activity || !this.editForm.description.trim()) {
            showWarning("Validasi Gagal", "Pastikan Project, Activity, dan Description telah diisi.");
            return;
        }

        if (!this.editForm.date || !this.editForm.begin || !this.editForm.end) {
            showWarning("Validasi Gagal", "Tanggal, waktu mulai, dan waktu selesai wajib diisi.");
            return;
        }

        const workStart = new Date(`${this.editForm.date}T${this.editForm.begin}:00`);
        const workEnd = new Date(`${this.editForm.date}T${this.editForm.end}:00`);
        if (workStart >= workEnd) {
            showWarning("Validasi Jam Kerja", "Waktu mulai harus lebih awal dari waktu selesai.");
            return;
        }

        const tagsString = Array.isArray(this.editForm.tags)
            ? this.editForm.tags.join(", ")
            : (this.editForm.tags || "");

        const payload = {
            begin: workStart.toISOString(),
            end: workEnd.toISOString(),
            project: parseInt(this.editForm.project, 10),
            activity: parseInt(this.editForm.activity, 10),
            description: this.editForm.description,
        };

        if (tagsString) {
            payload.tags = tagsString;
        }

        this.isSubmittingEdit = true;
        showLoading("Menyimpan Perubahan...", "Sedang memperbarui catatan timesheet...");

        try {
            await updateTimesheet(this.editForm.id, payload, this.token);
            closeAlert();
            await showSuccess("Perubahan Disimpan!", "Data timesheet berhasil diperbarui.", 2500);
            this.fetchTimesheets();
            this.navigate("");
        } catch (error) {
            closeAlert();
            showError("Gagal Memperbarui", error.message);
        } finally {
            this.isSubmittingEdit = false;
        }
    },
});
