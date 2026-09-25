# 3000 Miles

A road-trip vocabulary game for Thai learners of English. Learn the 3,000 words of
The Oxford 3000 (American English) and drive across the USA: every word you really learn
is one mile, from New York to Santa Monica Pier.

**Status:** in development. See [docs/ROADMAP.md](docs/ROADMAP.md).

## How it teaches

- After the first meeting, every contact with a word is a question (retrieval practice).
- Spaced repetition with Leitner boxes. A word counts as a mile only after right answers
  on three different days; forgotten words come back as "flat tires".
- Questions get harder as a word gets stronger: meaning, listening, word choice, gap-fill,
  spelling.
- Every word has a Thai meaning, an everyday American example sentence with a Thai
  translation, and text-to-speech.

## Run

Needs Node.js 22+. Run `npm start` (or double-click `start.bat`) and open
http://localhost:5320. Tests: `npm test`. UI check (needs Google Chrome): `npm run ui`.

Built with plain ES modules: no framework, no build step, no dependencies.

## Credits

Word list: The Oxford 3000™ (American English) © Oxford University Press. This is a
personal learning project, not affiliated with or endorsed by Oxford University Press.
Thai meanings, example sentences and translations were written for this project.
Fonts: Overpass, Overpass Mono, Anuphan (SIL Open Font License).
