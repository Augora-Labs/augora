import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { units, xlmToStroops } from "../../frontend/soroban.js";

describe("xlmToStroops validation and conversion (#45)", () => {
  it("throws the greater-than-zero message for '0' and '0.0000000'", () => {
    for (const zeroInput of ["0", "0.0000000", "0.0", "000.0000000"]) {
      assert.throws(
        () => units.xlmToStroops(zeroInput),
        {
          name: "Error",
          message: "Position amount must be greater than zero.",
        },
        `Expected "${zeroInput}" to throw greater-than-zero error`,
      );
    }
  });

  it("throws the format message for negative ('-1') and 8-decimal ('1.12345678') inputs", () => {
    for (const invalidInput of ["-1", "-0.5", "1.12345678", "0.00000001", "", "abc"]) {
      assert.throws(
        () => xlmToStroops(invalidInput),
        {
          name: "Error",
          message: "Enter a valid XLM amount with no more than 7 decimal places.",
        },
        `Expected "${invalidInput}" to throw format error`,
      );
    }
  });

  it("converts valid positive XLM strings with up to 7 decimal places into stroops", () => {
    assert.equal(xlmToStroops("1"), 10_000_000n);
    assert.equal(xlmToStroops("0.0000001"), 1n);
    assert.equal(xlmToStroops("12.3456789"), 123_456_789n);
  });
});
