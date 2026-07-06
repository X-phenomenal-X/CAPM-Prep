// Reads the classic app's saved progress (same localStorage origin on
// GitHub Pages) and reproduces its readiness core formula, so the R3F
// tower lights to the learner's true state.
const PKEY = 'capm_pro_v1';
const DOMAINS = [
  { id: 'd1', weight: 36 },
  { id: 'd2', weight: 17 },
  { id: 'd3', weight: 20 },
  { id: 'd4', weight: 27 },
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

export function readinessPct(progress) {
  if (!progress || !progress.domains) return null;
  const masteryOf = (id) => {
    const x = progress.domains[id];
    return x && x.attempted ? x.correct / x.attempted : 0;
  };
  const attemptedOf = (id) => {
    const x = progress.domains[id];
    return x ? x.attempted : 0;
  };
  let practice = 0;
  let att = 0;
  for (const d of DOMAINS) {
    practice += (d.weight / 100) * masteryOf(d.id);
    att += attemptedOf(d.id);
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
