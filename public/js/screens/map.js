// #/map: the road from New York (top) to Santa Monica (bottom), DESIGN §7.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { countMiles } from '../srs.js';
import { carFraction, nextStop } from '../progress.js';
import { openCheckpoint, mapMiles } from '../checkpoint.js';
import { starsRow } from '../components/stars.js';

export function render(root, app) {
  const { route, store } = app;
  const stops = route.stops;
  const miles = countMiles(store.state.cards);
  const next = nextStop(route, miles);
  const { checkpoints, stops: unlockedStops } = store.state;
  const gate = openCheckpoint(route, miles, checkpoints, unlockedStops);
  const unlocked = (s) => s.at === 0 || store.state.stops[s.id] != null;

  const rows = stops.map((s) => {
    const open = unlocked(s);
    const best = checkpoints[s.id]?.best ?? 0;
    const body = open
      ? h('a', { class: `map-tile map-${s.color}`, href: `#/postcard/${s.id}`, id: `tile-${s.id}` },
          en(s.city, { class: 'map-city' }), en(s.state, { class: 'map-state' }),
          best ? starsRow(best, { small: true, id: `stars-${s.id}` }) : null)
      : gate && s.id === gate.id
        ? h('a', { class: 'sign sign-checkpoint map-next map-gate', lang: 'en', id: 'map-gate', href: `#/checkpoint/${s.id}` },
            h('span', { class: 'sign-small' }, 'CHECKPOINT'),
            h('span', { class: 'map-city' }, s.city))
      : next && s.id === next.id
        ? h('div', { class: 'sign map-next', lang: 'en', id: 'map-next' },
            h('span', { class: 'sign-small' }, 'NEXT STOP'),
            h('span', { class: 'map-city' }, s.city),
            h('span', { class: 'sign-small' }, `${(s.at - miles).toLocaleString('en-US')} miles to go`))
        : h('div', { class: 'map-later' }, en(s.city, { class: 'map-city' }), en(s.state, { class: 'map-state' }));
    return h('li', { class: `map-row${open ? '' : ' map-locked'}` },
      h('span', { class: 'mile-post', lang: 'en' }, s.at.toLocaleString('en-US')),
      h('span', { class: 'map-dot' }),
      body);
  });

  const car = h('span', { class: 'map-car', id: 'map-car', html: icons.car, role: 'img', 'aria-label': `${miles} ไมล์` });
  car.style.setProperty('--f', carFraction(route, mapMiles(route, miles, checkpoints, unlockedStops))); // it waits at an open checkpoint

  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/' }, h('span', { html: icons.back }), th('กลับ')),
    h('h1', { class: 'results-title' }, th('แผนที่ทริป')),
    h('p', { class: 'muted', style: { textAlign: 'center' } }, en(`${miles.toLocaleString('en-US')} / ${route.total.toLocaleString('en-US')} miles`)),
    h('ol', { class: 'map-road' }, rows, car),
  );

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer = setTimeout(() => car.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }), 50);
  return { destroy() { clearTimeout(timer); } };
}
