// Reads the classic app's saved progress (same localStorage origin on
// GitHub Pages) and reproduces its readiness core formula, so the R3F
// tower lights to the learner's true state.
const PKEY = 'capm_pro_v1';

export const DOMAINS = [
  { id: 'd1', code: 'I', name: 'Fundamentals & Core Concepts', short: 'Fundamentals', weight: 36, color: '#6db5c9' },
  { id: 'd2', code: 'II', name: 'Predictive, Plan-Based', short: 'Predictive', weight: 17, color: '#f0a830' },
  { id: 'd3', code: 'III', name: 'Agile Frameworks', short: 'Agile', weight: 20, color: '#5fc27e' },
  { id: 'd4', code: 'IV', name: 'Business Analysis', short: 'Business Analysis', weight: 27, color: '#bd92d6' },
];

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PKEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function masteryOf(progress, id) {
  const x = progress && progress.domains ? progress.domains[id] : null;
  return x && x.attempted ? x.correct / x.attempted : 0;
}
function attemptedOf(progress, id) {
  const x = progress && progress.domains ? progress.domains[id] : null;
  return x ? x.attempted : 0;
}

export function domainStats(progress) {
  return DOMAINS.map((d) => ({
    ...d,
    mastery: masteryOf(progress, d.id),
    attempted: attemptedOf(progress, d.id),
  }));
}

export function readinessPct(progress) {
  if (!progress || !progress.domains) return null;
  let practice = 0;
  let att = 0;
  for (const d of DOMAINS) {
    practice += (d.weight / 100) * masteryOf(progress, d.id);
    att += attemptedOf(progress, d.id);
  }
  practice *= 100;
  const mk = progress.mock || {};
  const hist = mk.history || [];
  const mockSignal = hist.length ? 0.5 * (mk.best || 0) + 0.5 * (mk.last || 0) : null;
  let core = Math.round(mockSignal != null ? 0.45 * practice + 0.55 * mockSignal : practice);
  if (att < 10) core = Math.min(core, 40);
  return Math.max(0, Math.min(100, core));
}

export function charterName(progress) {
  return progress && progress.charter && progress.charter.name ? progress.charter.name : null;
}

/* Port of the classic app's pace forecast: linear regression over mock
   history, projected to the 70% pass line. */
export function forecast(progress) {
  const hist = (progress && progress.mock && progress.mock.history) || [];
  const pts = hist
    .filter((h) => h && h.d && typeof h.s === 'number')
    .map((h) => ({ t: Date.parse(h.d + 'T00:00:00'), s: h.s }))
    .filter((p) => isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return { state: 'need', pts: pts.map((p) => p.s) };
  const t0 = pts[0].t;
  const xs = pts.map((p) => (p.t - t0) / 86400000);
  const ys = pts.map((p) => p.s);
  const n = xs.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const den = n * sxx - sx * sx;
  const b = den ? (n * sxy - sx * sy) / den : 0;
  const a = (sy - b * sx) / n;
  const last = ys[n - 1];
  const best = Math.max(...ys);
  if (best >= 70 || last >= 70) return { state: 'hit', best, last, pts: ys };
  if (b <= 0.05) return { state: 'flat', last, pts: ys };
  const nowDays = (Date.now() - t0) / 86400000;
  const targetX = (70 - a) / b;
  const daysFromNow = Math.max(0, Math.ceil(targetX - nowDays));
  const out = { state: 'project', date: new Date(Date.now() + daysFromNow * 86400000), daysFromNow, last, pts: ys };
  if (progress.examDate) {
    const dte = Math.ceil((Date.parse(progress.examDate + 'T00:00:00') - Date.now()) / 86400000);
    out.margin = dte - daysFromNow;
    out.onTrack = out.margin >= 0;
  }
  return out;
}
