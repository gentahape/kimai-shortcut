# Kimai Shortcut

Kimai Shortcut is a lightweight web application designed to simplify interacting with the Kimai time-tracking system API. It provides an intuitive interface to log in using your Kimai API token, view your timesheets, and efficiently create new time records. A standout feature is its ability to automatically split an 8-hour workday and skip the lunch break (12:00 PM - 1:00 PM) when creating new timesheet entries.

## Dependencies

This project relies on the following libraries and tools:

- **[Alpine.js](https://alpinejs.dev/)** - A rugged, minimal framework for composing JavaScript behavior in your markup.
- **[Tailwind CSS](https://tailwindcss.com/)** - A utility-first CSS framework for rapid UI development.
- **[SweetAlert2](https://sweetalert2.github.io/)** - A beautiful, responsive, customizable replacement for JavaScript's popup boxes (utilizing `@sweetalert2/theme-dark`).

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
   Copy the `.env.example` file to create a `.env` file, then update the `VITE_KIMAI_API_URL` to point to your Kimai instance's API endpoint:
   ```bash
   cp .env.example .env
   ```
   Inside `.env`:
   ```env
   VITE_KIMAI_API_URL=https://your-kimai-instance.com/api
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
   - On the application page, enter your Kimai **API Token** to sign in.
   - Once authenticated, you can view your recent timesheets, search records, and browse through pages.
   - Click CREATE button to add a new record, fill in the required fields (date, project, activity, description), and the app will process your 8-hour workday entries, automatically skipping the lunch hour.