import { test } from "node:test";
import assert from "node:assert/strict";
import BN from "bn.js";
import { normalizeAmount, normalizePubkey } from "../src/validate";
import { VeilPayValidationError } from "../src/errors";

test("normalizeAmount accepts every Amount form", () => {
  assert.equal(normalizeAmount(5).toString(), "5");
  assert.equal(normalizeAmount(5n).toString(), "5");
  assert.equal(normalizeAmount("5").toString(), "5");
  assert.equal(normalizeAmount(new BN(5)).toString(), "5");
  assert.equal(normalizeAmount("18446744073709551615").toString(), "18446744073709551615");
});

test("normalizeAmount rejects zero unless allowed", () => {
  assert.throws(() => normalizeAmount(0), VeilPayValidationError);
  assert.equal(normalizeAmount(0, "x", true).toString(), "0");
});

test("normalizeAmount rejects negative, non-integer, and overflow", () => {
  assert.throws(() => normalizeAmount(-1), VeilPayValidationError);
  assert.throws(() => normalizeAmount(1.5), VeilPayValidationError);
  assert.throws(() => normalizeAmount("not-a-number"), VeilPayValidationError);
  assert.throws(() => normalizeAmount("18446744073709551616"), VeilPayValidationError); // u64max+1
});

test("normalizePubkey parses valid keys and rejects junk", () => {
  const valid = "11111111111111111111111111111111";
  assert.equal(normalizePubkey(valid).toBase58(), valid);
  assert.throws(() => normalizePubkey("nope"), VeilPayValidationError);
});
