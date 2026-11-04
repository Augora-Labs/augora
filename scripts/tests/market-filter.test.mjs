import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { installAugoraDom, MockEvent } from "./dom-harness.mjs";

describe("market filter event handlers in frontend/script.js (#44)", () => {
  let document;
  let scriptMod;

  before(async () => {
    ({ document } = installAugoraDom());
    scriptMod = await import("../../frontend/script.js");
  });

  after(() => {
    scriptMod?.stopPublicPolling?.();
  });

  it("activates only the clicked Crypto button and renders cards matching the crypto category in baseMarkets", () => {
    const filterButtons = document.querySelectorAll("[data-filter]");
    assert.equal(filterButtons.length, 3);

    const cryptoButton = filterButtons.find((btn) => btn.dataset.filter === "crypto");
    assert.ok(cryptoButton, "Expected a [data-filter='crypto'] button");

    cryptoButton.dispatchEvent(new MockEvent("click", { bubbles: true, cancelable: true }));

    const activeButtons = filterButtons.filter((btn) => btn.classList.contains("active"));
    assert.equal(activeButtons.length, 1, "Exactly one filter button should carry the active class");
    assert.equal(activeButtons[0], cryptoButton, "The Crypto filter button should be the active button");

    const expectedCryptoMarkets = scriptMod.baseMarkets.filter((m) => m.category === "crypto");
    const renderedCards = document.querySelector("#market-list").querySelectorAll(".market-card");
    assert.equal(
      renderedCards.length,
      expectedCryptoMarkets.length,
      "Rendered market card count should match the crypto category count in baseMarkets",
    );
    for (const card of renderedCards) {
      assert.equal(card.querySelector(".category")?.textContent, "crypto");
    }
  });

  it("updates active state and rendered cards when switching between Network and All filters", () => {
    const filterButtons = document.querySelectorAll("[data-filter]");
    const networkButton = filterButtons.find((btn) => btn.dataset.filter === "network");
    const allButton = filterButtons.find((btn) => btn.dataset.filter === "all");

    networkButton.dispatchEvent(new MockEvent("click", { bubbles: true, cancelable: true }));
    assert.deepEqual(
      filterButtons.filter((b) => b.classList.contains("active")),
      [networkButton],
    );
    const expectedNetworkCount = scriptMod.baseMarkets.filter((m) => m.category === "network").length;
    assert.equal(
      document.querySelector("#market-list").querySelectorAll(".market-card").length,
      expectedNetworkCount,
    );

    allButton.dispatchEvent(new MockEvent("click", { bubbles: true, cancelable: true }));
    assert.deepEqual(
      filterButtons.filter((b) => b.classList.contains("active")),
      [allButton],
    );
    assert.equal(
      document.querySelector("#market-list").querySelectorAll(".market-card").length,
      scriptMod.baseMarkets.length,
    );
  });
});
