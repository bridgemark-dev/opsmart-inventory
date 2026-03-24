/* ============================================================
   SALES CHART — SVG path animation (Daily / Weekly toggle)
   Replace path data with values from your reporting API.
   ============================================================ */

const CHART_PATHS = {
  daily: {
    line: 'M0,110 L60,90 L120,70 L180,85 L240,55 L300,40 L360,60 L420,45 L480,30 L540,50 L600,35',
    area: 'M0,110 L60,90 L120,70 L180,85 L240,55 L300,40 L360,60 L420,45 L480,30 L540,50 L600,35 L600,160 L0,160Z',
  },
  weekly: {
    line: 'M0,120 L60,100 L120,80 L180,60 L240,75 L300,50 L360,35 L420,55 L480,40 L540,25 L600,30',
    area: 'M0,120 L60,100 L120,80 L180,60 L240,75 L300,50 L360,35 L420,55 L480,40 L540,25 L600,30 L600,160 L0,160Z',
  },
};

/**
 * Switch the chart between daily and weekly views.
 * @param {HTMLElement} btn  - The clicked toggle button
 * @param {'daily'|'weekly'} mode
 */
function setToggle(btn, mode) {
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const chartLine = document.getElementById('chart-line');
  const chartArea = document.getElementById('chart-area');
  if (!chartLine || !chartArea) return;

  chartLine.setAttribute('d', CHART_PATHS[mode].line);
  chartArea.setAttribute('d', CHART_PATHS[mode].area);
}
