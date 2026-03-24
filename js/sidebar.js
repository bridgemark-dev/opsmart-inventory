/* ============================================================
   SIDEBAR — Toggle (collapse / mobile drawer)
   ============================================================ */

let sidebarCollapsed = false;

/**
 * Collapse or expand the sidebar on desktop.
 */
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;

  const sidebar = document.getElementById('sidebar');
  const header  = document.getElementById('header');
  const main    = document.getElementById('main');
  const toggle  = document.getElementById('sidebar-toggle');

  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  header.classList.toggle('sidebar-collapsed-header', sidebarCollapsed);
  main.classList.toggle('sidebar-collapsed-main', sidebarCollapsed);

  toggle.textContent = sidebarCollapsed ? '▶' : '◀';
}

/**
 * Slide sidebar in / out on mobile.
 */
function toggleMobile() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

/**
 * Show / hide the mobile hamburger button based on viewport width.
 * Call on load and on resize.
 */
function checkMobile() {
  const mobBtn = document.getElementById('mob-menu');
  if (!mobBtn) return;

  if (window.innerWidth <= 768) {
    mobBtn.style.display = 'flex';
  } else {
    mobBtn.style.display = 'none';
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

window.addEventListener('resize', checkMobile);
document.addEventListener('DOMContentLoaded', checkMobile);
