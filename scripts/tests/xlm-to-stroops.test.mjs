import assert from "node:assert/strict";
import test from "node:test";
import { units } from "../../frontend/soroban.js";

const formatMessage = "Enter a valid XLM amount with no more than 7 decimal places.";
const positiveMessage = "Position amount must be greater than zero.";

// Exercise the existing public entry point; never copy the parser into the test.
for (const [input, message] of [
  ["0", positiveMessage],
  ["0.0000000", positiveMessage],
  ["-1", formatMessage],
  ["1.12345678", formatMessage],
  ["0.00000000", formatMessage],
  ["-0", formatMessage],
  ["", formatMessage],
  ["1e2", formatMessage],
  [".1", formatMessage],
  ["1.", formatMessage],
  ["1.2.3", formatMessage],
]) {
  test(`rejects ${JSON.stringify(input)} with its exact validation error`, () => {
    assert.throws(() => units.xlmToStroops(input), { name: "Error", message });
  });
}

for (const [input, expected] of [
  ["0.0000001", 1n],
  ["1", 10_000_000n],
  ["1.1234567", 11_234_567n],
  ["0001.2300000", 12_300_000n],
  [" 1.5 ", 15_000_000n],
  ["9007199254740993.1234567", 90_071_992_547_409_931_234_567n],
]) {
  test(`converts ${JSON.stringify(input)} to exact BigInt stroops`, () => {
    assert.equal(units.xlmToStroops(input), expected);
  });
}
