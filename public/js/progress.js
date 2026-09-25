// Tank, streak and route helpers (DESIGN §6). Pure.

const stopsOf = (route) => (Array.isArray(route) ? route : route.stops);

export function tank(plan) {
  if (plan.goal <= 0) return plan.legs > 0 ? 1 : 0;
  return Math.min(1, plan.done / plan.goal);
}

// A new day's plan is made on day `today`: spend rests on missed days, or lose the streak.
export function rollover(streak, today) {
  if (streak.last == null) return { ...streak };
  const missed = today - 1 - streak.last;
  if (missed <= 0) return { ...streak };
  if (streak.rests >= missed) return { ...streak, rests: streak.rests - missed, last: today - 1 };
  return { ...streak, cur: 0 };
}

// The tank first becomes full on day `today`.
export function fillTank(streak, today) {
  if (streak.last === today) return { ...streak };
  const cur = streak.last === today - 1 ? streak.cur + 1 : 1;
  const rests = cur % 7 === 0 ? Math.min(2, streak.rests + 1) : streak.rests;
  return { cur, best: Math.max(streak.best, cur), last: today, rests };
}

export function nextStop(route, miles) {
  return stopsOf(route).find((s) => s.at > miles) ?? null;
}

export function lastStop(route, miles) {
  const stops = stopsOf(route);
  let out = stops[0];
  for (const s of stops) if (s.at <= miles) out = s;
  return out;
}

export function reachedStops(route, before, after) {
  return stopsOf(route).filter((s) => s.at > before && s.at <= after);
}

// Stops (not New York) that `miles` has reached but `unlocked` ({ id: day }) doesn't list yet.
export function newlyReached(route, miles, unlocked) {
  return stopsOf(route).filter((s) => s.at > 0 && s.at <= miles && unlocked[s.id] == null);
}

// Card ids whose mile falls in (previous stop's at, this stop's at], sorted by mile.
export function stopWords(cards, route, stopId) {
  const stops = stopsOf(route);
  const i = stops.findIndex((s) => s.id === stopId);
  if (i < 0) return [];
  const lo = i === 0 ? 0 : stops[i - 1].at;
  const hi = stops[i].at;
  return Object.keys(cards)
    .filter((id) => cards[id].m > lo && cards[id].m <= hi)
    .sort((a, b) => cards[a].m - cards[b].m);
}

// 0..1 along the map; stops are evenly spaced, the position inside a segment follows miles.
export function carFraction(route, miles) {
  const stops = stopsOf(route);
  const last = stops.length - 1;
  if (miles <= stops[0].at) return 0;
  if (miles >= stops[last].at) return 1;
  let i = 0;
  while (stops[i + 1].at <= miles) i++;
  const seg = (miles - stops[i].at) / (stops[i + 1].at - stops[i].at);
  return (i + seg) / last;
}
