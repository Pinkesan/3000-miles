// #/card/<id>: preview of the Meet card (design and tests).
import { h, setChildren, th } from '../ui.js';
import { icons } from '../icons.js';
import { wordCard } from '../components/wordcard.js';

export function render(root, app, { args }) {
  const word = app.byId.get(args[0]) || app.words[0];
  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/' }, h('span', { html: icons.back }), th('กลับหน้าแรก')),
    wordCard(app, word, { onLearned: () => {}, onKnow: () => {} }),
  );
}
