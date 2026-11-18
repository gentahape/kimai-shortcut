# Kimai Shortcut

Kimai Shortcut is a lightweight web application designed to simplify interacting with the Kimai time-tracking system API. It provides an intuitive interface to log in using your Kimai API token, view your timesheets, and efficiently create or edit time records. Standout features include dedicated Add/Edit pages, dynamic multiple form submissions, automated workday chunking skipping lunch breaks (12:00 PM - 1:00 PM), and seamless Light/Dark mode.

## Key Features

- **Dynamic Multiple Form Submissions**: Add several timesheet records across different days or projects at once with "+ Add Another" and duplicate controls, all submitted sequentially with real-time progress and error resilience.
- **Dedicated Page Flows**: No modals — dedicated Add and Edit pages with clean browser hash routing (`#/`, `#/add`, `#/edit/:id`).
- **Automated Chunking**: Automatically splits an 8-hour workday (or customized work schedule) into chunks (e.g., 4h max) and skips lunch break.
- **Light & Dark Mode**: Full theme toggle support with auto-detection and persistence.
- **Searchable Dropdowns & Tagging**: Fast autocomplete for Customers, Projects, Activities, and Tags.
- **Modular & Maintainable Architecture**: Clean separation between services, components, constants, and utilities.

## Dependencies

This project relies on the following libraries and tools:

- **[Alpine.js](https://alpinejs.dev/)** - A rugged, minimal framework for composing JavaScript behavior in your markup.
- **[Tailwind CSS](https://tailwindcss.com/)** - A utility-first CSS framework for rapid UI development (v4 with dark mode variant).
- **[SweetAlert2](https://sweetalert2.github.io/)** - Responsive, customizable dialogs and notifications adapted for both light and dark mode.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gentahape/kimai-shortcut.git
   cd kimai-shortcut
   ```

2. **Install dependencies:**
   Ensure you have Node.js and npm installed, then run:
   ```bash
   npm install
   ```

3. **Configuration:**
   Copy the `.env.example` file to create a `.env` file, then update the configuration:
   ```bash
   cp .env.example .env
   ```
   Inside `.env`:
   ```env
   VITE_KIMAI_API_URL=https://your-kimai-instance.com/api

   # Work schedule (fully configurable — no code changes needed)
   VITE_WORK_START_TIME=08:00
   VITE_WORK_END_TIME=17:00
   VITE_LUNCH_START=12:00
   VITE_LUNCH_END=13:00
   VITE_CHUNK_HOURS=4
   ```

## Usage

1. **Serve the application for development:**
   This project uses Vite. You can run the development server with Hot Module Replacement (HMR) by running:
   ```bash
   npm run dev
   ```

2. **Access the application:**
   Open your browser and navigate to the local URL provided in the terminal (usually `http://localhost:5173`).

3. **Build for production:**
   To build the static files for deployment, run:
   ```bash
   npm run build
   ```
   The output will be placed in the `dist/` directory.

4. **Track Time:**
   - Enter your Kimai **API Bearer Token** in the navigation bar to sign in.
   - **View & Search**: Browse your timesheet history with fast search, pagination, and duration badges.
   - **Add Timesheets**: Click **Tambah Timesheet** (`#/add`) to open the dedicated Add page. Fill one form or click **+ Add Another** / **Salin** to add multiple forms at once. Click **Submit All** to save all entries.
   - **Edit Timesheets**: Click the edit button on any table row (`#/edit/:id`) to modify a record.
   - **Delete Timesheets**: Click the delete icon with confirmation to remove an entry.
   - **Toggle Theme**: Click the sun/moon icon in the navigation bar to toggle between Light and Dark mode.

## Work Schedule Configuration

The work schedule is fully configurable via environment variables. Simply update your `.env` file:

| Variable | Default | Description |
|---|---|---|
| `VITE_WORK_START_TIME` | `08:00` | Work start time (HH:MM) |
| `VITE_WORK_END_TIME` | `17:00` | Work end time (HH:MM) |
| `VITE_LUNCH_START` | `12:00` | Lunch break start (HH:MM) |
| `VITE_LUNCH_END` | `13:00` | Lunch break end (HH:MM) |
| `VITE_CHUNK_HOURS` | `4` | Timesheet chunk size in hours |

**Examples:**

```env
# 09:00 - 18:00 workday (lunch 12:00-13:00) → 8 hours
VITE_WORK_START_TIME=09:00
VITE_WORK_END_TIME=18:00

# 07:00 - 16:00 workday (lunch 12:00-13:00) → 8 hours
VITE_WORK_START_TIME=07:00
VITE_WORK_END_TIME=16:00

# 08:00 - 17:00, lunch 11:30-12:30 → 8 hours
VITE_WORK_START_TIME=08:00
VITE_WORK_END_TIME=17:00
VITE_LUNCH_START=11:30
VITE_LUNCH_END=12:30
```

> ⚠️ After changing `.env`, restart the dev server (`npm run dev`) for Vite to pick up the new values.