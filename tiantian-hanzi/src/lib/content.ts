/**
 * Loads the seed content from /content/*.json and indexes it.
 *
 * Content is deliberately kept out of the database: the JSON files are the
 * editable source of truth, and the database only stores a learner's progress
 * against item ids derived from them.
 */
import componentsJson from "../../content/components.json";
import charactersJson from "../../content/characters.json";
import wordsJson from "../../content/words.json";

export type ItemType = "component" | "character" | "word";

type Shared = {
  id: string;
  type: ItemType;
  level: number;
  /** The glyph(s) shown to the learner. */
  glyph: string;
  meaning: string;
  acceptedMeanings: string[];
  meaningMnemonic: string;
  /** Ids that must reach Guru before this item unlocks. */
  dependencyIds: string[];
};

export type ComponentItem = Shared & { type: "component"; slug: string };
export type CharacterItem = Shared & {
  type: "character";
  slug: string;
  reading: string;
  acceptedReadings: string[];
  readingMnemonic: string;
};
export type WordItem = Omit<CharacterItem, "type"> & { type: "word" };
export type Item = ComponentItem | CharacterItem | WordItem;

export type QuizKind = "meaning" | "reading";

/** Components are meaning-only; characters and words are quizzed on both. */
export function quizKinds(item: Item): QuizKind[] {
  return item.type === "component" ? ["meaning"] : ["meaning", "reading"];
}

export function hasReading(item: Item): item is CharacterItem | WordItem {
  return item.type !== "component";
}

export const componentId = (slug: string) => `component:${slug}`;
export const characterId = (character: string) => `character:${character}`;
export const wordId = (word: string) => `word:${word}`;

const rawComponents = componentsJson as {
  slug: string;
  character: string;
  level: number;
  meaning: string;
  alternativeMeanings: string[];
  meaningMnemonic: string;
}[];

const rawCharacters = charactersJson as {
  character: string;
  level: number;
  meaning: string;
  alternativeMeanings: string[];
  pinyin: string;
  alternativePinyin: string[];
  components: string[];
  meaningMnemonic: string;
  readingMnemonic: string;
}[];

const rawWords = wordsJson as {
  word: string;
  level: number;
  meaning: string;
  alternativeMeanings: string[];
  pinyin: string;
  alternativePinyin: string[];
  characters: string[];
  meaningMnemonic: string;
  readingMnemonic: string;
}[];

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const COMPONENTS: ComponentItem[] = rawComponents.map((c) => ({
  id: componentId(c.slug),
  type: "component",
  slug: c.slug,
  level: c.level,
  glyph: c.character,
  meaning: c.meaning,
  acceptedMeanings: unique([c.meaning, ...c.alternativeMeanings]),
  meaningMnemonic: c.meaningMnemonic,
  dependencyIds: [],
}));

export const CHARACTERS: CharacterItem[] = rawCharacters.map((c) => ({
  id: characterId(c.character),
  type: "character",
  slug: c.character,
  level: c.level,
  glyph: c.character,
  meaning: c.meaning,
  acceptedMeanings: unique([c.meaning, ...c.alternativeMeanings]),
  meaningMnemonic: c.meaningMnemonic,
  reading: c.pinyin,
  acceptedReadings: unique([c.pinyin, ...c.alternativePinyin]),
  readingMnemonic: c.readingMnemonic,
  dependencyIds: unique(c.components.map(componentId)),
}));

export const WORDS: WordItem[] = rawWords.map((w) => ({
  id: wordId(w.word),
  type: "word",
  slug: w.word,
  level: w.level,
  glyph: w.word,
  meaning: w.meaning,
  acceptedMeanings: unique([w.meaning, ...w.alternativeMeanings]),
  meaningMnemonic: w.meaningMnemonic,
  reading: w.pinyin,
  acceptedReadings: unique([w.pinyin, ...w.alternativePinyin]),
  readingMnemonic: w.readingMnemonic,
  dependencyIds: unique(w.characters.map(characterId)),
}));

export const ALL_ITEMS: Item[] = [...COMPONENTS, ...CHARACTERS, ...WORDS];

const byId = new Map<string, Item>(ALL_ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): Item | undefined {
  return byId.get(id);
}

export function requireItem(id: string): Item {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export const MAX_LEVEL = ALL_ITEMS.reduce((max, item) => Math.max(max, item.level), 1);

export function itemsAtLevel(level: number): Item[] {
  return ALL_ITEMS.filter((item) => item.level === level);
}

export function charactersAtLevel(level: number): CharacterItem[] {
  return CHARACTERS.filter((item) => item.level === level);
}

/** The components a character is built from, in the order the content lists them. */
export function dependenciesOf(item: Item): Item[] {
  return item.dependencyIds.map(requireItem);
}

/** Items that are blocked until this one is passed — used on item pages. */
export function dependentsOf(id: string): Item[] {
  return ALL_ITEMS.filter((item) => item.dependencyIds.includes(id));
}

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  component: "Component",
  character: "Character",
  word: "Word",
};

/**
 * A trimmed, serialisable item for client components. Keeps the content JSON
 * out of the browser bundle: pages pass these props down instead of importing
 * the content module from a "use client" file.
 */
export type QuizItem = {
  id: string;
  type: ItemType;
  level: number;
  glyph: string;
  meaning: string;
  acceptedMeanings: string[];
  meaningMnemonic: string;
  reading: string | null;
  acceptedReadings: string[];
  readingMnemonic: string | null;
  parts: { glyph: string; meaning: string; type: ItemType }[];
};

export function toQuizItem(item: Item): QuizItem {
  return {
    id: item.id,
    type: item.type,
    level: item.level,
    glyph: item.glyph,
    meaning: item.meaning,
    acceptedMeanings: item.acceptedMeanings,
    meaningMnemonic: item.meaningMnemonic,
    reading: hasReading(item) ? item.reading : null,
    acceptedReadings: hasReading(item) ? item.acceptedReadings : [],
    readingMnemonic: hasReading(item) ? item.readingMnemonic : null,
    parts: dependenciesOf(item).map((part) => ({
      glyph: part.glyph,
      meaning: part.meaning,
      type: part.type,
    })),
  };
}
