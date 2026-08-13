import Swal from "sweetalert2";

export default () => ({
    token: "",
    isAuthenticated: false,
    isLoading: false,
    user: {},
    isModalOpen: false,
    formData: {
        date: "",
        begin: "",
        end: "",
        description: "",
        customer: "",
        project: "",
        activity: "",
        tags: [],
        durationPreset: "2h",
        customDuration: 1,
    },

    durationPresets: [
        { value: "2h", label: "2 Jam (Default)", hours: 2 },
        { value: "1h", label: "1 Jam", hours: 1 },
        { value: "1.5h", label: "1.5 Jam", hours: 1.5 },
        { value: "3h", label: "3 Jam", hours: 3 },
        { value: "4h", label: "4 Jam", hours: 4 },
        { value: "full", label: "Full Day (Tanpa Pembagian)", hours: null },
        { value: "custom", label: "Custom...", hours: null },
    ],

    getChunkHours() {
        const preset = this.durationPresets.find(
            (p) => p.value === this.formData.durationPreset,
        );
        if (!preset || preset.value === "full") {
            return this.workConfig.expectedWorkHours;
        }
        if (preset.value === "custom") {
            return Number(this.formData.customDuration) || 2;
        }
        return preset.hours || 2;
    },

    get calculatedChunks() {
        if (!this.formData.begin || !this.formData.end) return [];
        const dateStr = this.formData.date || "2000-01-01";
        const workStart = new Date(`${dateStr}T${this.formData.begin}:00`);
        const workEnd = new Date(`${dateStr}T${this.formData.end}:00`);
        if (workStart >= workEnd) return [];

        const cfg = this.workConfig;
        const lunchStart = new Date(`${dateStr}T${cfg.lunchStart}:00`);
        const lunchEnd = new Date(`${dateStr}T${cfg.lunchEnd}:00`);

        const chunkHours = this.getChunkHours();
        const chunkMs = chunkHours * 60 * 60 * 1000;

        let current = new Date(workStart);
        const finalEnd = new Date(workEnd);
        const slots = [];

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

            const bStr = current.toTimeString().substring(0, 5);
            const eStr = chunkEnd.toTimeString().substring(0, 5);
            slots.push(`${bStr}–${eStr}`);

            current = new Date(chunkEnd);
        }
        return slots;
    },

    onPresetChange() {
        // Changing duration preset adjusts the chunking interval.
        // Begin and End times remain default work hours (08:00 - 17:00).
    },

    customers: [],
    projects: [],
    activities: [],
    availableTags: [],

    timesheets: [],
    searchQuery: "",
    currentPage: 1,
    itemsPerPage: 10,

    /**
     * Single source of truth for all work schedule configuration.
     * All values are read from VITE_* environment variables with sensible defaults.
     * To change the work schedule, simply update the .env file — no code changes needed.
     */
    get workConfig() {
        return {
            startTime: import.meta.env.VITE_WORK_START_TIME || "08:00",
            endTime: import.meta.env.VITE_WORK_END_TIME || "17:00",
            lunchStart: import.meta.env.VITE_LUNCH_START || "12:00",
            lunchEnd: import.meta.env.VITE_LUNCH_END || "13:00",
            chunkHours: Number(import.meta.env.VITE_CHUNK_HOURS) || 2,
            get expectedWorkHours() {
                // Calculate expected hours: (end - start) minus lunch duration
                const [sh, sm] = this.startTime.split(":").map(Number);
                const [eh, em] = this.endTime.split(":").map(Number);
                const [lh, lm] = this.lunchStart.split(":").map(Number);
                const [leH, leM] = this.lunchEnd.split(":").map(Number);
                const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                const lunchMin = (leH * 60 + leM) - (lh * 60 + lm);
                return (totalMin - lunchMin) / 60;
            },
        };
    },

    async loadPartial(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            return await response.text();
        } catch (error) {
            console.error(error);
            return `<div class="text-red-500">Error loading component.</div>`;
        }
    },

    init() {
        this.checkSession();
        if (this.isAuthenticated) {
            this.fetchMasterData();
            this.fetchTimesheets();
        }

        this.$watch("searchQuery", () => {
            this.currentPage = 1;
        });
    },

    checkSession() {
        const savedUser = localStorage.getItem("kimai_user");
        const savedToken = localStorage.getItem("kimai_token");
        if (savedUser && savedToken) {
            try {
                this.user = JSON.parse(savedUser);
                this.token = savedToken;
                this.isAuthenticated = true;
            } catch (e) {
                this.logout();
            }
        }
    },

    async login() {
        if (!this.token.trim()) {
            this.showAlert(
                "Access Denied",
                "Token cannot be empty!",
                "warning",
            );
            return;
        }
        this.isLoading = true;
        try {
            const response = await fetch(`${import.meta.env.VITE_KIMAI_API_URL}/users/me`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/json",
                },
            });
            if (response.status === 401)
                throw new Error("Unauthorized: Token is missing or invalid.");
            if (!response.ok)
                throw new Error(
                    `Server error occurred (Error ${response.status})`,
                );

            const userData = await response.json();
            const essentialUser = {
                id: userData.id,
                username: userData.username,
                alias: userData.alias || userData.username,
                title: userData.title || "",
                avatar: userData.avatar || "",
                "color-safe": userData["color-safe"] || userData.color || "#4F46E5",
            };

            localStorage.setItem("kimai_token", this.token);
            localStorage.setItem("kimai_user", JSON.stringify(essentialUser));

            this.user = essentialUser;
            this.isAuthenticated = true;

            Swal.fire({
                title: "Sign In Successful",
                text: "Token verified successfully!",
                icon: "success",
                background: "#1F2937",
                color: "#fff",
                showConfirmButton: false,
                timer: 1500,
            });

            this.fetchMasterData();
            this.fetchTimesheets();
        } catch (error) {
            this.showAlert("Authentication Failed", error.message, "error");
        } finally {
            this.isLoading = false;
        }
    },

    logout() {
        localStorage.removeItem("kimai_token");
        localStorage.removeItem("kimai_user");
        sessionStorage.removeItem("kimai_token");
        sessionStorage.removeItem("kimai_user");
        this.token = "";
        this.user = {};
        this.customers = [];
        this.projects = [];
        this.activities = [];
        this.availableTags = [];
        this.timesheets = [];
        this.searchQuery = "";
        this.isAuthenticated = false;
    },

    async fetchMasterData() {
        try {
            const headers = {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/json",
            };
            const [resCust, resProj, resAct, resTags] = await Promise.all([
                fetch(`${import.meta.env.VITE_KIMAI_API_URL}/customers`, { headers }),
                fetch(`${import.meta.env.VITE_KIMAI_API_URL}/projects`, { headers }),
                fetch(`${import.meta.env.VITE_KIMAI_API_URL}/activities`, { headers }),
                fetch(`${import.meta.env.VITE_KIMAI_API_URL}/tags`, { headers }),
            ]);

            if (
                resCust.status === 401 ||
                resProj.status === 401 ||
                resAct.status === 401 ||
                resTags.status === 401
            ) {
                this.logout();
                this.showAlert(
                    "Session Expired",
                    "API token is expired or invalid. Please sign in again.",
                    "error",
                );
                return;
            }

            if (resCust.ok) this.customers = await resCust.json();
            if (resProj.ok) {
                const rawProjects = await resProj.json();
                this.projects = rawProjects.map((p) => ({
                    id: p.id,
                    name: p.parentTitle
                        ? `${p.parentTitle} | ${p.name}`
                        : p.name,
                }));
            }
            if (resAct.ok) this.activities = await resAct.json();
            if (resTags.ok) this.availableTags = await resTags.json();
        } catch (error) {
            console.error(error);
            this.showAlert(
                "Warning",
                "Failed to load some dropdown options.",
                "warning",
            );
        }
    },

    async fetchTimesheets() {
        try {
            const response = await fetch(`${import.meta.env.VITE_KIMAI_API_URL}/timesheets`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    Accept: "application/json",
                },
            });
            if (response.status === 401) {
                this.logout();
                this.showAlert(
                    "Session Expired",
                    "API token is expired or invalid.",
                    "error",
                );
                return;
            }
            if (!response.ok) throw new Error("Failed to load timesheet data.");
            this.timesheets = await response.json();
        } catch (error) {
            this.showAlert("Error", error.message, "error");
        }
    },

    get filteredTimesheets() {
        if (this.searchQuery === "") return this.timesheets;
        const q = this.searchQuery.toLowerCase();
        return this.timesheets.filter((row) => {
            return (
                (row.description &&
                    row.description.toLowerCase().includes(q)) ||
                (row.begin && row.begin.includes(q))
            );
        });
    },

    get totalPages() {
        return (
            Math.ceil(this.filteredTimesheets.length / this.itemsPerPage) || 1
        );
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

    openModal() {
        this.formData.date = new Date().toISOString().split("T")[0];
        this.formData.begin = this.workConfig.startTime;
        this.formData.end = this.workConfig.endTime;
        this.formData.durationPreset = "2h";
        this.formData.customDuration = 1;
        this.formData.description = "";
        this.formData.customer = "";
        this.formData.project = "";
        this.formData.activity = "";
        this.formData.tags = [];
        this.isModalOpen = true;
    },

    closeModal() {
        this.isModalOpen = false;
    },

    async saveRecord() {
        if (!this.formData.durationPreset) {
            this.showAlert(
                "Validation Failed",
                "Duration Present wajib diisi.",
                "warning",
            );
            return;
        }

        if (
            !this.formData.project ||
            !this.formData.activity ||
            !this.formData.description
        ) {
            this.showAlert(
                "Validation Failed",
                "Please ensure all required fields (*) are filled.",
                "warning",
            );
            return;
        }

        const cfg = this.workConfig;
        const dateStr = this.formData.date;
        let workStart = new Date(`${dateStr}T${this.formData.begin}:00`);
        let workEnd = new Date(`${dateStr}T${this.formData.end}:00`);

        if (workStart >= workEnd) {
            this.showAlert(
                "Invalid Duration",
                "Start time must be before end time.",
                "warning",
            );
            return;
        }

        const chunkHours = this.getChunkHours();
        if (!chunkHours || chunkHours <= 0) {
            this.showAlert(
                "Validation Failed",
                "Duration Present tidak valid.",
                "warning",
            );
            return;
        }

        const lunchStart = new Date(`${dateStr}T${cfg.lunchStart}:00`);
        const lunchEnd = new Date(`${dateStr}T${cfg.lunchEnd}:00`);

        Swal.fire({
            title: "Processing...",
            text: "Splitting and sending timesheet data...",
            allowOutsideClick: false,
            background: "#1F2937",
            color: "#fff",
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            let current = new Date(workStart);
            const finalEnd = new Date(workEnd);
            const payloads = [];
            const tagsString =
                this.formData.tags.length > 0
                    ? this.formData.tags.join(", ")
                    : "";

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

                payloads.push({
                    begin: current.toISOString(),
                    end: chunkEnd.toISOString(),
                    project: parseInt(this.formData.project),
                    activity: parseInt(this.formData.activity),
                    description: this.formData.description,
                    tags: tagsString,
                });

                current = new Date(chunkEnd);
            }

            if (payloads.length === 0) {
                throw new Error("Tidak ada interval jam kerja yang valid untuk dikirim.");
            }

            let successCount = 0;

            for (const payload of payloads) {
                const response = await fetch(
                    `${import.meta.env.VITE_KIMAI_API_URL}/timesheets`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${this.token}`,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(payload),
                    },
                );

                if (!response.ok) {
                    const errorData = await response.json();

                    if (
                        response.status === 400 &&
                        errorData.errors &&
                        errorData.errors.errors
                    ) {
                        const errorMessages =
                            errorData.errors.errors.join("<br> • ");
                        throw new Error(
                            `Validation Error on chunk <b>${payload.begin.substring(11, 16)}</b> to <b>${payload.end.substring(11, 16)}</b>:<br> • ${errorMessages}`,
                        );
                    }

                    throw new Error(
                        errorData.message ||
                            `Server error (${response.status})`,
                    );
                }

                successCount++;
            }

            this.closeModal();

            Swal.fire({
                title: "Success!",
                text: `${successCount} records created successfully.`,
                icon: "success",
                background: "#1F2937",
                color: "#fff",
                timer: 5000,
                showConfirmButton: false,
            }).then(() => {
                this.fetchTimesheets();
            });
        } catch (error) {
            console.error("Submit Error:", error);
            Swal.fire({
                title: "Failed to Save",
                html: `<div class="text-left text-sm text-gray-300 mt-2">${error.message}</div>`,
                icon: "error",
                background: "#1F2937",
                color: "#fff",
                confirmButtonColor: "#DC2626",
            });
        }
    },

    showAlert(title, text, icon) {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            background: "#1F2937",
            color: "#fff",
            confirmButtonColor:
                icon === "error" || icon === "warning" ? "#DC2626" : "#2563EB",
        });
    },
});

