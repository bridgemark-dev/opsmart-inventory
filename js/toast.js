/* ============================================================
   TOAST — Lightweight notification utility
   ============================================================ */

let _toastTimer = null;

/**
 * Display a temporary toast message at the bottom-right of the screen.
 * @param {string} msg     - Message to display
 * @param {number} duration - Duration in ms (default 2400)
 */
function showToast(msg, duration = 2400) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = msg;
  toast.style.display = 'block';

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}
