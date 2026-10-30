export const ORDER_GUARD_MESSAGES = Object.freeze({
  inFlight: "A transaction is already in flight for this market. Please wait for confirmation.",
  missingAddress: "Connect a funded Freighter Testnet wallet first.",
  zeroBalance: "Fund your Testnet wallet before placing a position.",
  insufficientBalance: "Leave at least 1 test XLM available for account reserves and fees.",
});

/**
 * Run the wallet guard ladder before continuing an on-chain order submission.
 * The continuation makes the boundary explicit: it is never invoked for a
 * blocked order, which keeps contract calls behind every guard.
 */
export async function withSubmitOrderWalletGuards({
  marketId,
  inFlightMarkets,
  action,
  stake,
  onAllowed,
}) {
  if (inFlightMarkets.has(marketId)) {
    window.showWalletNotice(ORDER_GUARD_MESSAGES.inFlight, true);
    return { allowed: false };
  }

  const wallet = window.stellarWallet;
  const walletState = wallet?.getState();
  if (!walletState?.address) {
    window.showWalletNotice(ORDER_GUARD_MESSAGES.missingAddress, true);
    await wallet?.connect();
    return { allowed: false };
  }
  if (action === "buy" && walletState.balance === 0) {
    window.showWalletNotice(ORDER_GUARD_MESSAGES.zeroBalance, true);
    return { allowed: false };
  }
  if (action === "buy" && Number.isFinite(walletState.balance) && stake + 1 > walletState.balance) {
    window.showWalletNotice(ORDER_GUARD_MESSAGES.insufficientBalance, true);
    return { allowed: false };
  }

  return {
    allowed: true,
    value: await onAllowed({ wallet, walletState }),
  };
}
