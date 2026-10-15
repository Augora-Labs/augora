import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { units, xlmToStroops } from "../../frontend/soroban.js";

describe("xlmToStroops zero, negative, and precision validation", () => {
  it("throws the greater-than-zero message for '0' and '0.0000000'", () => {
    for (const input of ["0", "0.0000000"]) {
      assert.throws(
        () => xlmToStroops(input),
        {
          name: "Error",
          message: "Position amount must be greater than zero.",
        },
      );
      assert.throws(
        () => units.xlmToStroops(input),
        {
          name: "Error",
          message: "Position amount must be greater than zero.",
        },
      );
    }
  });

  it("throws the format message for negative ('-1') and eight-decimal ('1.12345678') inputs", () => {
    for (const input of ["-1", "1.12345678"]) {
      assert.throws(
        () => xlmToStroops(input),
        {
          name: "Error",
          message: "Enter a valid XLM amount with no more than 7 decimal places.",
        },
      );
    }
  });

  it("converts valid positive XLM strings to stroops", () => {
    assert.equal(xlmToStroops("1"), 10_000_000n);
    assert.equal(xlmToStroops("0.0000001"), 1n);
    assert.equal(xlmToStroops("25.5"), 255_000_000n);
  });
});
