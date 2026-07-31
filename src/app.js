import { ENV } from "./config.js";
import Swal from "sweetalert2";

export default () => ({
    token: "",
    isAuthenticated: false,
    isLoading: false,
    user: {},
    isModalOpen: false,
    formData: {
        date: "",
        begin: "08:00",
        end: "17:00",
        description: "",
        customer: "",
        project: "",
        activity: "",
        tags: [],
    },

    customers: [],
    projects: [],
    activities: [],
    availableTags: [],

    timesheets: [],
    searchQuery: "",
    currentPage: 1,
    itemsPerPage: 10,

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
        const savedUser = sessionStorage.getItem("kimai_user");
        const savedToken = sessionStorage.getItem("kimai_token");
        if (savedUser && savedToken) {
            this.user = JSON.parse(savedUser);
            this.token = savedToken;
            this.isAuthenticated = true;
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
            const response = await fetch(`${ENV.KIMAI_API_URL}/users/me`, {
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
            sessionStorage.setItem("kimai_token", this.token);
            sessionStorage.setItem("kimai_user", JSON.stringify(userData));

            this.user = userData;
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
                fetch(`${ENV.KIMAI_API_URL}/customers`, { headers }),
                fetch(`${ENV.KIMAI_API_URL}/projects`, { headers }),
                fetch(`${ENV.KIMAI_API_URL}/activities`, { headers }),
                fetch(`${ENV.KIMAI_API_URL}/tags`, { headers }),
            ]);

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
            const response = await fetch(`${ENV.KIMAI_API_URL}/timesheets`, {
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
        this.formData.begin = "08:00";
        this.formData.end = "17:00";
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

        const dateStr = this.formData.date;
        let workStart = new Date(`${dateStr}T${this.formData.begin}:00`);
        let workEnd = new Date(`${dateStr}T${this.formData.end}:00`);

        const lunchStart = new Date(`${dateStr}T12:00:00`);
        const lunchEnd = new Date(`${dateStr}T13:00:00`);

        let totalMs = workEnd - workStart;

        let overlapStart = workStart > lunchStart ? workStart : lunchStart;
        let overlapEnd = workEnd < lunchEnd ? workEnd : lunchEnd;
        let lunchOverlapMs =
            overlapStart < overlapEnd ? overlapEnd - overlapStart : 0;

        let totalWorkHours = (totalMs - lunchOverlapMs) / (1000 * 60 * 60);

        if (totalWorkHours !== 8) {
            this.showAlert(
                "Invalid Duration",
                `Total working hours must be exactly 8 hours. Calculated duration: <b>${totalWorkHours} hours</b>.`,
                "warning",
            );
            return;
        }

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

            while (current < finalEnd) {
                if (current >= lunchStart && current < lunchEnd) {
                    current = new Date(lunchEnd);
                    continue;
                }

                let chunkEnd = new Date(current.getTime() + 2 * 60 * 60 * 1000);

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

            let successCount = 0;

            for (const payload of payloads) {
                const response = await fetch(
                    `${ENV.KIMAI_API_URL}/timesheets`,
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
                text: `${successCount} records created successfully (auto-split skipping lunch break).`,
                icon: "success",
                background: "#1F2937",
                color: "#fff",
                timer: 3000,
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
