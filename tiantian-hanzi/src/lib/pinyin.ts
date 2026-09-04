/**
 * Pinyin helpers.
 *
 * The reading input accepts three shapes of the same answer:
 *   - numbered pinyin: "ni3 hao3"      (converted to tone marks as the user types)
 *   - typed tone marks: "nǐ hǎo"
 *   - toneless pinyin:  "ni hao"       (recognised, but graded as a tone mistake)
 */

const TONE_ROWS: Record<string, string[]> = {
  // index 0..3 == tones 1..4
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

/** Every toned vowel mapped back to { base letter, tone number }. */
const TONED_LETTERS = new Map<string, { base: string; tone: number }>();
for (const [base, marks] of Object.entries(TONE_ROWS)) {
  marks.forEach((mark, i) => TONED_LETTERS.set(mark, { base, tone: i + 1 }));
}

const SYLLABLE_WITH_NUMBER = /([a-zA-ZüÜvV]+)([1-5])/g;

/** Where the tone mark goes: a/e win, "ou" puts it on the o, otherwise the last vowel. */
function toneMarkIndex(letters: string): number {
  const lower = letters.toLowerCase();
  const a = lower.indexOf("a");
  if (a !== -1) return a;
  const e = lower.indexOf("e");
  if (e !== -1) return e;
  const ou = lower.indexOf("ou");
  if (ou !== -1) return ou;
  for (let i = lower.length - 1; i >= 0; i--) {
    if ("aeiouü".includes(lower[i])) return i;
  }
  return -1;
}

/** "lv" / "nv" are the usual keyboard stand-ins for lü / nü. */
function normaliseUmlaut(syllable: string): string {
  return syllable.replace(/([lnLN])[vV]/g, (_m, consonant: string) => `${consonant}ü`);
}

/**
 * Convert any finished numbered syllable into its tone-marked form.
 * Safe to call on every keystroke: syllables without a trailing digit are left alone,
 * so "ni3 ha" becomes "nǐ ha" and only turns into "nǐ hǎo" once "hao3" is complete.
 */
export function numberedToToneMarks(input: string): string {
  return input.replace(SYLLABLE_WITH_NUMBER, (_match, letters: string, digit: string) => {
    const syllable = normaliseUmlaut(letters);
    const tone = Number(digit);
    if (tone === 5) return syllable; // neutral tone carries no mark
    const index = toneMarkIndex(syllable);
    if (index === -1) return syllable;
    const vowel = syllable[index];
    const row = TONE_ROWS[vowel.toLowerCase()];
    if (!row) return syllable;
    const marked = row[tone - 1];
    return (
      syllable.slice(0, index) +
      (vowel === vowel.toUpperCase() && vowel !== vowel.toLowerCase() ? marked.toUpperCase() : marked) +
      syllable.slice(index + 1)
    );
  });
}

export type SyllableParts = { base: string; tone: number };

/** Split a tone-marked syllable into its toneless letters and its tone number (0 = unmarked). */
export function splitTone(syllable: string): SyllableParts {
  let tone = 0;
  let base = "";
  for (const char of syllable) {
    const toned = TONED_LETTERS.get(char);
    if (toned) {
      tone = toned.tone;
      base += toned.base;
    } else {
      base += char;
    }
  }
  return { base, tone };
}

/** Normalise free-form input into comparable syllables, e.g. "Ni3  hao3!" -> ["ni3", "hao3"]. */
export function toSyllables(input: string): SyllableParts[] {
  const converted = numberedToToneMarks(input.trim().toLowerCase());
  return converted
    .replace(/['’·]/g, " ")
    .split(/[\s]+/)
    .filter(Boolean)
    .map((raw) => {
      const cleaned = normaliseUmlaut(raw).replace(/[^a-z\u00fc\u00c0-\u024f]/g, "");
      const { base, tone } = splitTone(cleaned);
      return { base, tone };
    })
    .filter((s) => s.base.length > 0);
}

export type ReadingVerdict =
  | { result: "correct"; matched: string }
  | { result: "wrong-tone"; matched: string }
  | { result: "incorrect" };

/**
 * Grade a reading answer against the accepted readings.
 * A wrong tone is incorrect, but reported separately so the answer screen can
 * highlight which tone the learner missed.
 */
export function checkReading(input: string, accepted: string[]): ReadingVerdict {
  const given = toSyllables(input);
  if (given.length === 0) return { result: "incorrect" };

  let toneMiss: string | null = null;

  for (const candidate of accepted) {
    const want = toSyllables(candidate);
    if (want.length !== given.length) continue;
    const sameLetters = want.every((syllable, i) => syllable.base === given[i].base);
    if (!sameLetters) continue;
    const sameTones = want.every((syllable, i) => syllable.tone === given[i].tone);
    if (sameTones) return { result: "correct", matched: candidate };
    toneMiss = toneMiss ?? candidate;
  }

  if (toneMiss) return { result: "wrong-tone", matched: toneMiss };
  return { result: "incorrect" };
}

/** Per-syllable diff used by the answer screen to point at the tone that was missed. */
export function toneDiff(input: string, expected: string): { syllable: string; ok: boolean }[] {
  const given = toSyllables(input);
  const want = toSyllables(expected);
  const display = expected.trim().split(/\s+/);
  return want.map((syllable, i) => ({
    syllable: display[i] ?? syllable.base,
    ok: given[i] ? given[i].tone === syllable.tone && given[i].base === syllable.base : false,
  }));
}
