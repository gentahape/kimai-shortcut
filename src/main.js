import "sweetalert2/dist/sweetalert2.min.css";
import "./css/style.css";

import Alpine from "alpinejs";
import kimaiApp from "./app.js";
import searchSelect from "./components/searchSelect.js";
import tagInput from "./components/tagInput.js";
import { initTheme } from "./services/themeService.js";

// Initialize theme immediately to prevent flashing
initTheme();

window.Alpine = Alpine;

// Register Reusable Alpine Components
Alpine.data("searchSelect", searchSelect);
Alpine.data("tagInput", tagInput);
Alpine.data("kimaiApp", kimaiApp);

// Start Alpine
Alpine.start();
