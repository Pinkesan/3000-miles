// #/postcard/<id>: front "Greetings from" + the city, back with the fact and the words earned (DESIGN §7, §8).
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { stopWords } from '../progress.js';
import { wordItem } from '../components/wordrow.js';

const MAX_WORDS = 12;

export function render(root, app, params) {
  const { route, store, byId } = app;
  const stop = route.stops.find((s) => s.id === params.args[0]);
  if (!stop || (stop.at > 0 && store.state.stops[stop.id] == null)) {
    location.replace('#/map');
    return null;
  }

  const front = h('section', { class: `postcard postcard-front pc-${stop.color}`, id: 'postcard-front' },
    en('Greetings from', { class: 'pc-greet' }),
    en(stop.city, { class: 'pc-city' }),
    en(stop.state, { class: 'pc-state' }),
  );

  let back;
  if (stop.at === 0) {
    back = h('section', { class: 'postcard-back', id: 'postcard-back' },
      h('div', { class: 'pc-fact' },
        en(stop.fact),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ฟังประโยค', html: icons.speaker, onclick: () => app.say(stop.fact) })),
      th(stop.factTh, { class: 'muted' }),
      h('p', { class: 'pc-welcome' }, th('ผ่าน ตม. ที่ JFK มาแล้ว ต่อไปคือขับข้ามอเมริกา · ต่อจากเรื่อง '), en('Journey to America')),
    );
  } else {
    const ids = stopWords(store.state.cards, route, stop.id);
    const shown = ids.slice(0, MAX_WORDS).map((id) => byId.get(id)).filter(Boolean);
    back = h('section', { class: 'postcard-back', id: 'postcard-back' },
      h('div', { class: 'pc-fact' },
        en(stop.fact),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ฟังประโยค', html: icons.speaker, onclick: () => app.say(stop.fact) })),
      th(stop.factTh, { class: 'muted' }),
      h('h2', {}, th('คำที่ได้ในช่วงนี้'), th(` (${ids.length} คำ)`, { class: 'muted' })),
      shown.length
        ? h('ul', { class: 'pc-words', id: 'pc-words' },
            shown.map((w) => wordItem(w)))
        : h('p', { class: 'muted' }, th('ยังไม่มีคำในช่วงนี้')),
    );
  }

  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/map' }, h('span', { html: icons.back }), th('แผนที่')),
    front,
    back,
  );
  return { destroy() { app.stopSay(); } };
}
