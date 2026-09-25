// Numbers for the results screen (DESIGN §7). Pure.

// lastLeg: { stats: { right, wrong, taught, known, reviewed, miles }, startMiles, endMiles }
export function legSummary(lastLeg) {
  const s = lastLeg?.stats ?? {};
  const right = s.right || 0;
  const graded = right + (s.wrong || 0);
  const startMiles = lastLeg?.startMiles || 0;
  const endMiles = Math.max(startMiles, lastLeg?.endMiles || 0);
  return {
    graded,
    pct: graded ? Math.round((right / graded) * 100) : null,
    gained: endMiles - startMiles,
    startMiles,
    endMiles,
    taught: s.taught || 0,
    known: s.known || 0,
    reviewed: s.reviewed || 0,
  };
}

// The tank (daily goal): 0..1. No goal (goal 0) counts as full once any leg was driven.
export function tankFill(plan) {
  if (!plan) return 0;
  if (plan.goal <= 0) return plan.legs > 0 ? 1 : 0;
  return Math.min(1, plan.done / plan.goal);
}

export function tankText(plan) {
  const fill = tankFill(plan);
  if (fill >= 1) return 'เติมน้ำมันเต็มถังแล้ว วันนี้ขับครบ';
  return `ถังน้ำมันวันนี้ ${Math.round(fill * 100)}%`;
}

// The unique word ids of a leg queue, in order.
export function queueIds(queue) {
  return [...new Set(queue.map((x) => x.id))];
}
