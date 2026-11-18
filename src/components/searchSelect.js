/**
 * Reusable Alpine searchable dropdown component.
 */
export default function searchSelect() {
    return {
        open: false,
        search: "",

        toggle() {
            this.open = !this.open;
            if (this.open) {
                this.$nextTick(() => {
                    const input = this.$refs.searchInput || this.$el.querySelector("input[type='text']");
                    if (input) input.focus();
                });
            }
        },

        close() {
            this.open = false;
            this.search = "";
        },

        filterList(items) {
            const list = Array.isArray(items) ? items : [];
            if (!this.search.trim()) return list;
            const q = this.search.toLowerCase();
            return list.filter((item) => (item.name || "").toLowerCase().includes(q));
        },

        getSelectedName(items, selectedId, placeholder = "Pilih...") {
            const list = Array.isArray(items) ? items : [];
            const found = list.find((item) => String(item.id) === String(selectedId));
            return found ? found.name : placeholder;
        },

        isSelected(selectedId) {
            return selectedId !== null && selectedId !== undefined && selectedId !== "";
        },
    };
}

