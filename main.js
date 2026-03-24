import { initRouter } from './js/router.js';
import { CONFIG }     from './config.js';

// Apply client branding from config
document.getElementById('brand-client').textContent  = CONFIG.CLIENT_NAME;
document.getElementById('brand-product').textContent = CONFIG.PRODUCT_NAME;
document.getElementById('version-label').textContent =
  `${CONFIG.PRODUCT_NAME} v${CONFIG.VERSION} · ${CONFIG.COMPANY_NAME}`;
document.getElementById('link-google').href   = CONFIG.LINKS.google;
document.getElementById('link-facebook').href = CONFIG.LINKS.facebook;
document.getElementById('link-website').href  = CONFIG.LINKS.website;

// Boot the router
initRouter();
