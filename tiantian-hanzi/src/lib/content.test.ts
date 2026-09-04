import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_ITEMS, CHARACTERS, COMPONENTS, MAX_LEVEL, WORDS, getItem, requireItem } from "./content.ts";

/**
 * Guards the seed content in content/*.json. If you add items, this is the test
 * that tells you whether the dependency chain still holds.
 */

test("every item id is unique", () => {
  const ids = ALL_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("characters are built from components that are taught by then", () => {
  for (const character of CHARACTERS) {
    assert.ok(character.dependencyIds.length >= 1, `${character.glyph} has no components`);
    for (const id of character.dependencyIds) {
      const component = getItem(id);
      assert.ok(component, `${character.glyph} references missing component ${id}`);
      assert.ok(
        component.level <= character.level,
        `${character.glyph} (L${character.level}) needs ${component.glyph} from L${component.level}`,
      );
    }
  }
});

test("words are multi-character and built only from taught characters", () => {
  for (const word of WORDS) {
    assert.ok(word.glyph.length >= 2, `${word.glyph} is not multi-character`);
    assert.equal(word.dependencyIds.length, new Set([...word.glyph]).size);
    for (const id of word.dependencyIds) {
      const character = getItem(id);
      assert.ok(character, `${word.glyph} references missing character ${id}`);
      assert.ok(
        character.level <= word.level,
        `${word.glyph} (L${word.level}) needs ${character.glyph} from L${character.level}`,
      );
    }
  }
});

test("pinyin has one syllable per character", () => {
  for (const item of [...CHARACTERS, ...WORDS]) {
    assert.equal(
      item.reading.split(/\s+/).length,
      [...item.glyph].length,
      `${item.glyph} reading "${item.reading}" does not have one syllable per character`,
    );
  }
});

test("every component is used by at least one character", () => {
  const used = new Set(CHARACTERS.flatMap((character) => character.dependencyIds));
  for (const component of COMPONENTS) {
    assert.ok(used.has(component.id), `component ${component.glyph} is never used`);
  }
});

test("every item has mnemonics, and characters and words have readings", () => {
  for (const item of ALL_ITEMS) {
    assert.ok(item.meaningMnemonic.length > 25, `${item.glyph} needs a meaning mnemonic`);
    assert.ok(item.acceptedMeanings.length >= 1);
    if (item.type !== "component") {
      assert.ok(item.readingMnemonic.length > 10, `${item.glyph} needs a reading mnemonic`);
      assert.ok(item.acceptedReadings.length >= 1);
    }
  }
});

test("the seed covers five levels with a full curriculum", () => {
  assert.equal(MAX_LEVEL, 5);
  assert.equal(CHARACTERS.length, 60);
  assert.equal(WORDS.length, 80);
  assert.equal(COMPONENTS.length, 46);
  for (let level = 1; level <= MAX_LEVEL; level++) {
    assert.equal(CHARACTERS.filter((item) => item.level === level).length, 12);
    assert.ok(COMPONENTS.filter((item) => item.level === level).length > 0);
    assert.ok(WORDS.filter((item) => item.level === level).length > 0);
  }
});

test("requireItem throws on unknown ids", () => {
  assert.throws(() => requireItem("character:zzz"));
});
