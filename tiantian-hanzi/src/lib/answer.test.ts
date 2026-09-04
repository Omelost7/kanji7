import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMeaning, levenshtein, normaliseMeaning } from "./answer.ts";

test("meanings are normalised before comparison", () => {
  assert.equal(normaliseMeaning("  To Eat!  "), "eat");
  assert.equal(normaliseMeaning("The Sun"), "sun");
});

test("exact and alternative meanings are correct", () => {
  assert.equal(checkMeaning("good", ["good", "well", "fine"]), "correct");
  assert.equal(checkMeaning("Fine", ["good", "well", "fine"]), "correct");
  assert.equal(checkMeaning("to eat", ["eat"]), "correct");
});

test("near misses ask the learner to try again", () => {
  assert.equal(checkMeaning("mothre", ["mother"]), "close");
  assert.equal(checkMeaning("electricty", ["electricity"]), "close");
  assert.equal(checkMeaning("univercity", ["university"]), "close");
});

test("short answers get no typo slack", () => {
  assert.equal(checkMeaning("sun", ["sin"]), "incorrect");
  assert.equal(checkMeaning("ten", ["tea"]), "incorrect");
});

test("unrelated answers are wrong", () => {
  assert.equal(checkMeaning("horse", ["mother"]), "incorrect");
  assert.equal(checkMeaning("", ["mother"]), "incorrect");
});

test("levenshtein basics", () => {
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("same", "same"), 0);
});
