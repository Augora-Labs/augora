import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { installAugoraDom, MockEvent } from "./dom-harness.mjs";

describe("submit-order wallet guard branches in frontend/script.js (#46)", () => {
  let window;
  let document;
  let scriptMod;
  let notices;
  let placeBetCalls;
  let connectCalls;
  let walletState;

  before(async () => {
    ({ window, document } = installAugoraDom());
    scriptMod = await import("../../frontend/script.js");
  });

  after(() => {
    scriptMod?.stopPublicPolling?.();
  });

  beforeEach(() => {
    notices = [];
    placeBetCalls = [];
    connectCalls = 0;
    walletState = {
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      balance: 250,
    };

    scriptMod.baseMarkets[0].acceptingPositions = true;
    scriptMod.selectMarket(0, false);
    scriptMod.state.action = "buy";
    scriptMod.state.outcome = "yes";
    scriptMod.inFlightMarkets.clear();
    document.querySelector("#stake-amount").value = "100";

    window.showWalletNotice = (message, isError = false) => {
      notices.push({ message, isError });
    };

    window.stellarWallet = {
      getState: () => walletState,
      connect: async () => {
        connectCalls += 1;
      },
      signTransaction: async () => ({ signedTxXdr: "AAAA" }),
      refreshBalance: async () => {},
    };

    window.__augoraTradeImpl = {
      placeBet: async (args) => {
        placeBetCalls.push(args);
        return {
          hash: "a".repeat(64),
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${"a".repeat(64)}`,
          amountStroops: 1_000_000_000n,
        };
      },
      reducePosition: async () => {
        throw new Error("reducePosition should not be called in buy guard tests");
      },
    };
  });

  async function submitOrderForm() {
    const form = document.querySelector("#order-form");
    const ev = new MockEvent("submit", { bubbles: true, cancelable: true, target: form });
    form.dispatchEvent(ev);
    await form._lastDispatchPromise;
  }

  it("blocks submission when a transaction is already in flight for the market and never calls placeBet", async () => {
    scriptMod.inFlightMarkets.add(scriptMod.baseMarkets[0].onchainId);

    await submitOrderForm();

    assert.deepEqual(notices, [
      {
        message: "A transaction is already in flight for this market. Please wait for confirmation.",
        isError: true,
      },
    ]);
    assert.equal(placeBetCalls.length, 0, "placeBet must never be called when market is in flight");
  });

  it("blocks submission when wallet has no address, prompts connect, and never calls placeBet", async () => {
    walletState = { address: "", balance: 0 };

    await submitOrderForm();

    assert.deepEqual(notices, [
      {
        message: "Connect a funded Freighter Testnet wallet first.",
        isError: true,
      },
    ]);
    assert.equal(connectCalls, 1, "wallet.connect() should be called when address is missing");
    assert.equal(placeBetCalls.length, 0, "placeBet must never be called when address is missing");
  });

  it("blocks submission when wallet balance is zero and never calls placeBet", async () => {
    walletState = {
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      balance: 0,
    };

    await submitOrderForm();

    assert.deepEqual(notices, [
      {
        message: "Fund your Testnet wallet before placing a position.",
        isError: true,
      },
    ]);
    assert.equal(placeBetCalls.length, 0, "placeBet must never be called when balance is zero");
  });

  it("blocks submission when balance equals stake (leaving < 1 XLM for reserves) and never calls placeBet", async () => {
    document.querySelector("#stake-amount").value = "100";
    walletState = {
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      balance: 100,
    };

    await submitOrderForm();

    assert.deepEqual(notices, [
      {
        message: "Leave at least 1 test XLM available for account reserves and fees.",
        isError: true,
      },
    ]);
    assert.equal(placeBetCalls.length, 0, "placeBet must never be called when stake + 1 > balance");
  });

  it("allows submission when balance is just above stake plus one XLM (e.g. 101.01 for 100 XLM stake)", async () => {
    document.querySelector("#stake-amount").value = "100";
    walletState = {
      address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      balance: 101.01,
    };

    await submitOrderForm();

    assert.deepEqual(notices, []);
    assert.equal(placeBetCalls.length, 1, "placeBet should be called once when all wallet guards pass");
    assert.equal(placeBetCalls[0].amountXlm, "100");
    assert.equal(placeBetCalls[0].marketId, 3);
  });
});
