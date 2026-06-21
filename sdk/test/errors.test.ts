import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VeilPayError,
  VeilPayProgramError,
  VeilPayValidationError,
  wrapSendError,
} from "../src/errors";

test("wrapSendError decodes a known program error code", () => {
  const anchorLike = { error: { errorCode: { number: 6002 }, errorMessage: "raw" } };
  const wrapped = wrapSendError(anchorLike);
  assert.ok(wrapped instanceof VeilPayProgramError);
  assert.equal((wrapped as VeilPayProgramError).code, 6002);
  assert.equal((wrapped as VeilPayProgramError).codeName, "InsufficientFunds");
});

test("wrapSendError passes VeilPay errors through unchanged", () => {
  const original = new VeilPayValidationError("bad");
  assert.equal(wrapSendError(original), original);
});

test("wrapSendError falls back to a generic VeilPayError", () => {
  const wrapped = wrapSendError(new Error("boom"));
  assert.ok(wrapped instanceof VeilPayError);
  assert.ok(!(wrapped instanceof VeilPayProgramError));
  assert.equal(wrapped.message, "boom");
});
