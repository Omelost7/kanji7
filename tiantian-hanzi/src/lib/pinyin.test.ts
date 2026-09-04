import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReading, numberedToToneMarks, toneDiff, splitTone } from "./pinyin.ts";

test("numbered pinyin becomes tone marks", () => {
  assert.equal(numberedToToneMarks("ni3 hao3"), "nǐ hǎo");
  assert.equal(numberedToToneMarks("zhong1 guo2"), "zhōng guó");
  assert.equal(numberedToToneMarks("lv4"), "lǜ");
  assert.equal(numberedToToneMarks("ma5"), "ma");
  assert.equal(numberedToToneMarks("xie4 xie5"), "xiè xie");
});

test("partial input is left alone until the tone digit lands", () => {
  assert.equal(numberedToToneMarks("ni3 ha"), "nǐ ha");
  assert.equal(numberedToToneMarks("ni3 hao"), "nǐ hao");
  assert.equal(numberedToToneMarks("ni3 hao3"), "nǐ hǎo");
});

test("tone mark placement follows a/e, ou, then last vowel", () => {
  assert.equal(numberedToToneMarks("hao3"), "hǎo");
  assert.equal(numberedToToneMarks("gou3"), "gǒu");
  assert.equal(numberedToToneMarks("hui4"), "huì");
  assert.equal(numberedToToneMarks("xue2"), "xué");
});

test("splitTone recovers base letters and tone", () => {
  assert.deepEqual(splitTone("hǎo"), { base: "hao", tone: 3 });
  assert.deepEqual(splitTone("hao"), { base: "hao", tone: 0 });
});

test("readings accept numbers, marks, and reject wrong tones", () => {
  assert.equal(checkReading("hao3", ["hǎo"]).result, "correct");
  assert.equal(checkReading("hǎo", ["hǎo"]).result, "correct");
  assert.equal(checkReading("  HAO3 ", ["hǎo"]).result, "correct");
  assert.equal(checkReading("hao2", ["hǎo"]).result, "wrong-tone");
  assert.equal(checkReading("hao", ["hǎo"]).result, "wrong-tone");
  assert.equal(checkReading("hai3", ["hǎo"]).result, "incorrect");
  assert.equal(checkReading("", ["hǎo"]).result, "incorrect");
});

test("multi-syllable readings compare syllable by syllable", () => {
  assert.equal(checkReading("ni3 hao3", ["nǐ hǎo"]).result, "correct");
  assert.equal(checkReading("nihao", ["nǐ hǎo"]).result, "incorrect");
  assert.equal(checkReading("ni3 hao2", ["nǐ hǎo"]).result, "wrong-tone");
});

test("alternative readings are all accepted", () => {
  assert.equal(checkReading("de5", ["de", "dí", "dì"]).result, "correct");
  assert.equal(checkReading("di4", ["de", "dí", "dì"]).result, "correct");
});

test("toneDiff marks the syllable whose tone was missed", () => {
  assert.deepEqual(toneDiff("ni3 hao2", "nǐ hǎo"), [
    { syllable: "nǐ", ok: true },
    { syllable: "hǎo", ok: false },
  ]);
});
