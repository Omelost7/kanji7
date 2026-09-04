# Tiantian Hanzi 天天汉字

A spaced-repetition site for learning simplified Chinese characters, built on
WaniKani's structure: components build characters, characters build words, and
nothing unlocks until the things it is made of are known.

- **Components** — the building blocks (亻, 宀, 马 …), each with a name and a mnemonic.
- **Characters** — made of two or more components, with meanings and a pinyin reading.
- **Words** — multi-character vocabulary, made only of characters you have already learned.

A character unlocks once every one of its components reaches Guru; a word unlocks
once every one of its characters reaches Guru; you advance a level once 90% of that
level's characters are Guru or above.

## Running it

```bash
cd tiantian-hanzi
npm install
npm run db:migrate     # creates data/tiantian.db and the single local user
npm run dev            # http://localhost:3000
```

That is the whole setup — SQLite file, no services, no accounts.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests: pinyin, answer grading, the SRS ladder, and the seed content |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run content:check` | Validates `content/*.json` on its own (see below) |
| `npm run db:migrate` | Applies migrations, creates the local user |
| `npm run db:generate` | Regenerates SQL migrations after editing `src/db/schema.ts` |
| `npm run db:reset` | Deletes the database and starts over (stop `npm run dev` first — it holds the file open) |

### Node version and native modules

Use **Node 20 or newer**.

`better-sqlite3` is pinned to `^12` on purpose: from v13 it stopped shipping
prebuilt binaries, so `npm install` compiles it from source and needs a C++
toolchain — on Windows that means Visual Studio Build Tools. v12 downloads a ready
binary for every common platform, so installing needs nothing but Node. If you ever
bump it to v13 or later, expect `node-gyp` / `MSBuild` errors on machines without a
compiler.

On Windows PowerShell, `npm` may be blocked by the execution policy
(`UnauthorizedAccess` / `npm.ps1 cannot be loaded`). Either call `npm.cmd` instead of
`npm`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Using it

- **Lessons** introduce items five at a time: the character large, its components
  broken out below it, then a meaning mnemonic and a reading mnemonic. After each
  batch of five you are quizzed on those five before they enter the review queue at
  Apprentice 1.
- **Reviews** ask meaning and reading separately. Both have to be right before the
  item moves up a stage; miss either one and the item drops back.
- The reading box takes **numbered pinyin** and converts it as you type — `ni3 hao3`
  becomes `nǐ hǎo` — and it also accepts tone marks typed directly, or `lv4` for `lǜ`.
  A wrong tone counts as incorrect, and the answer screen highlights the syllable
  whose tone you missed.
- A meaning answer within a typo of a correct one shakes and lets you retype
  instead of being marked wrong.
- Everything is keyboard-driven: type, `Enter` to answer, `Enter` again to move on.
  Lessons also take `←` and `→`.

### SRS stages

| Stage | Wait until the next review |
| --- | --- |
| Apprentice 1–4 | 4h, 8h, 1d, 2d |
| Guru 1–2 | 1w, 2w |
| Master | 1mo |
| Enlightened | 4mo |
| Burned | never again |

Correct moves up one stage. Incorrect drops one stage from Apprentice, two from
Guru and above (never below Apprentice 1).

## Adding content

All content lives in **`content/`** as plain JSON, separate from the code. Edit the
files, restart the dev server, and the new items appear. Nothing is copied into the
database — progress rows reference items by an id derived from these files
(`component:<slug>`, `character:<字>`, `word:<词>`), so renaming a slug or a character
orphans that item's progress.

Run `npm run content:check` after editing. It verifies that every referenced
component and character exists, that dependencies are taught at the same level or
earlier, that pinyin has one syllable per character, and that nothing is missing a
mnemonic.

### `content/components.json`

```json
{
  "slug": "roof",                  // unique id, used by characters below
  "character": "宀",
  "level": 2,
  "meaning": "roof",
  "alternativeMeanings": ["house top"],
  "meaningMnemonic": "A roof with a chimney dot on top, covering everything underneath."
}
```

### `content/characters.json`

```json
{
  "character": "字",
  "level": 2,
  "meaning": "character",
  "alternativeMeanings": ["written character", "word"],
  "pinyin": "zì",                  // tone marks, one syllable
  "alternativePinyin": [],         // other accepted readings
  "components": ["roof", "child"], // component slugs, all at this level or earlier
  "meaningMnemonic": "A child (子) kept under a roof (宀) until it has learned to write.",
  "readingMnemonic": "Each one is a 'dz' (zì) of ink pressed hard onto the page."
}
```

### `content/words.json`

```json
{
  "word": "名字",
  "level": 3,
  "meaning": "name",
  "alternativeMeanings": ["full name"],
  "pinyin": "míng zi",             // one space-separated syllable per character
  "alternativePinyin": ["míng zì"],
  "characters": ["名", "字"],       // every one must exist in characters.json
  "meaningMnemonic": "The name (名) written out in characters (字).",
  "readingMnemonic": "字 goes neutral here: míng zi."
}
```

Rules the checker enforces:

- A character's components must all exist and be at the same level or an earlier one.
- A word's characters must all exist in `characters.json` and be at the same level or
  earlier — that is what makes the unlock chain work.
- Alternative meanings are matched leniently (case, punctuation, a leading "to"),
  so `["to eat"]` and `["eat"]` behave the same.
- Neutral tones are written without a mark (`míng bai`); add the marked form to
  `alternativePinyin` if you want to accept both.

### Adding a sixth level

Add items with `"level": 6` to the three files. The dashboard, the level browser and
the level-up rule all read the maximum level from the content, so nothing else needs
changing. The content test asserts the seed's own shape (5 levels, 60 characters,
80 words) — update those numbers there when you extend it.

## Seed content

46 components, 60 characters (12 per level) and 80 words across five levels,
simplified Chinese, vocabulary around HSK 1–2. The brief suggested about 25
components; the seed carries more because every character here decomposes into two
or more real components, and covering HSK 1–2 characters — 我, 是, 学, 老, 师, 国 —
needs a wider inventory of shapes than 25.

## How it is built

```
content/          the editable curriculum (components, characters, words)
src/lib/          pure logic: pinyin conversion, answer grading, the SRS ladder, content index
src/db/           Drizzle schema, migrations, the SQLite client
src/server/       every query the app makes; the only module that touches Drizzle
src/app/          App Router pages and the two API routes
src/components/   dashboard, lesson and review UI
drizzle/          generated SQL migrations
```

Next.js App Router, TypeScript, Tailwind v4, SQLite through Drizzle.

**Moving to Postgres and real auth.** Content is not in the database, so the only
tables are `users`, `progress` and `review_events` — all keyed by `user_id` already,
even though the app runs as a single local user (`LOCAL_USER_ID` in `src/db/index.ts`).
To swap engines, change the table builders in `src/db/schema.ts` from `sqliteTable`
to `pgTable` and the client in `src/db/index.ts` to a pg pool; `src/server/study.ts`
and everything above it are untouched. To add auth, resolve a session to a user id
and pass it into those same functions — each one already takes `userId` as an
argument.

## Design notes

Item types use a jade / cinnabar / ochre palette, checked for colour-blind
separation against the paper background, and deliberately not WaniKani's
blue/pink/purple. The SRS ladder uses a separate light-to-dark stone ramp so
"what kind of thing is this" and "how well do I know it" never compete for the same
colour. Chinese is set in Noto Serif SC with system Chinese serifs as fallbacks.
