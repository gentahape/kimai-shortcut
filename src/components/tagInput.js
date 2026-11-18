/**
 * Reusable Alpine Tag Input component.
 */
export default function tagInput() {
    return {
        open: false,
        search: "",

        getFilteredTags(availableTags, currentTags) {
            const pool = Array.isArray(availableTags) ? availableTags : [];
            const selected = Array.isArray(currentTags) ? currentTags : [];
            const q = this.search.toLowerCase().trim();

            return pool.filter(
                (tag) =>
                    !selected.includes(tag) &&
                    (!q || tag.toLowerCase().includes(q))
            );
        },

        addTag(currentTags, tag) {
            const clean = (tag || "").trim();
            if (!clean) return;
            if (!Array.isArray(currentTags)) return;
            if (!currentTags.includes(clean)) {
                currentTags.push(clean);
            }
            this.search = "";
            this.$nextTick(() => {
                if (this.$refs.tagSearchInput) {
                    this.$refs.tagSearchInput.focus();
                }
            });
        },

        removeTag(currentTags, tag) {
            if (!Array.isArray(currentTags)) return;
            const index = currentTags.indexOf(tag);
            if (index > -1) {
                currentTags.splice(index, 1);
            }
        },

        handleKeydown(event, currentTags, availableTags) {
            if (event.key === "Enter" && this.search.trim()) {
                event.preventDefault();
                const filtered = this.getFilteredTags(availableTags, currentTags);
                if (filtered.length > 0) {
                    this.addTag(currentTags, filtered[0]);
                } else {
                    this.addTag(currentTags, this.search.trim());
                }
            }
        },
    };
}

