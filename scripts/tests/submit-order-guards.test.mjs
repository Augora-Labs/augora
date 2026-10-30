import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import { withSubmitOrderWalletGuards } from "../../frontend/order-guards.js";

describe("submit-order wallet guards", () => {
  let inFlightMarkets;
  let notices;
  let walletState;
  let connect;
  let placeBet;

  beforeEach(() => {
    inFlightMarkets = new Set();
    notices = [];
    walletState = { address: "GTESTADDRESS", balance: 250 };
    connect = mock.fn(async () => {});
    placeBet = mock.fn(async () => ({ hash: "submitted" }));

    globalThis.window = {
      showWalletNotice: mock.fn((message, isError) => notices.push({ message, isError })),
      stellarWallet: {
        getState: mock.fn(() => walletState),
        connect,
      },
    };
  });

  async function submit({ marketId = 3, action = "buy", stake = 100 } = {}) {
    return withSubmitOrderWalletGuards({
      marketId,
      inFlightMarkets,
      action,
      stake,
      onAllowed: placeBet,
    });
  }

  it("blocks an in-flight market with the exact notice and no contract call", async () => {
    inFlightMarkets.add(3);

    const result = await submit();

    assert.deepEqual(result, { allowed: false });
    assert.deepEqual(notices, [{
      message: "A transaction is already in flight for this market. Please wait for confirmation.",
      isError: true,
    }]);
    assert.equal(placeBet.mock.callCount(), 0);
  });

  it("blocks a missing wallet address, requests a connection, and makes no contract call", async () => {
    walletState = { address: "", balance: 0 };

    const result = await submit();

    assert.deepEqual(result, { allowed: false });
    assert.deepEqual(notices, [{
      message: "Connect a funded Freighter Testnet wallet first.",
      isError: true,
    }]);
    assert.equal(connect.mock.callCount(), 1);
    assert.equal(placeBet.mock.callCount(), 0);
  });

  it("blocks a zero balance with the exact notice and no contract call", async () => {
    walletState = { address: "GTESTADDRESS", balance: 0 };

    const result = await submit();

    assert.deepEqual(result, { allowed: false });
    assert.deepEqual(notices, [{
      message: "Fund your Testnet wallet before placing a position.",
      isError: true,
    }]);
    assert.equal(placeBet.mock.callCount(), 0);
  });

  it("blocks when the balance equals the stake and makes no contract call", async () => {
    walletState = { address: "GTESTADDRESS", balance: 100 };

    const result = await submit({ stake: 100 });

    assert.deepEqual(result, { allowed: false });
    assert.deepEqual(notices, [{
      message: "Leave at least 1 test XLM available for account reserves and fees.",
      isError: true,
    }]);
    assert.equal(placeBet.mock.callCount(), 0);
  });

  it("allows a balance just above stake plus one", async () => {
    walletState = { address: "GTESTADDRESS", balance: 101.01 };

    const result = await submit({ stake: 100 });

    assert.equal(result.allowed, true);
    assert.deepEqual(notices, []);
    assert.equal(placeBet.mock.callCount(), 1);
    assert.deepEqual(placeBet.mock.calls[0].arguments[0], {
      wallet: window.stellarWallet,
      walletState,
    });
  });
});
