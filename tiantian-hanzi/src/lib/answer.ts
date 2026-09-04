/** Meaning grading: exact match, near miss ("try again"), or wrong. */

export type MeaningVerdict = "correct" | "close" | "incorrect";

const LEADING_ARTICLES = /^(to|a|an|the)\s+/;

export function normaliseMeaning(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_ARTICLES, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
}

/** How far off an answer may be before it stops counting as a typo. */
export function allowedDistance(answer: string): number {
  if (answer.length <= 3) return 0;
  if (answer.length <= 5) return 1;
  if (answer.length <= 8) return 2;
  return 3;
}

/**
 * Grade a meaning answer.
 * "close" means the learner is within a typo of a correct answer: the review
 * screen shakes and lets them retype instead of marking the item wrong.
 */
export function checkMeaning(input: string, accepted: string[]): MeaningVerdict {
  const given = normaliseMeaning(input);
  if (!given) return "incorrect";

  const candidates = accepted.map(normaliseMeaning).filter(Boolean);
  if (candidates.includes(given)) return "correct";

  for (const candidate of candidates) {
    if (levenshtein(given, candidate) <= allowedDistance(candidate)) return "close";
  }
  return "incorrect";
}
