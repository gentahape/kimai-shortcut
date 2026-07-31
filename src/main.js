import './css/style.css';

import Alpine from 'alpinejs';
import kimaiApp from './app.js';

import '@sweetalert2/theme-dark/dark.css';

window.Alpine = Alpine;

Alpine.data('kimaiApp', kimaiApp);

Alpine.start();
