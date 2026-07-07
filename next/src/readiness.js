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
