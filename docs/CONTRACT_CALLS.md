# Contract Calls and ABI Examples

This guide gives example calls for the Stellar Trade Soroban contracts. The
application's deployed contracts are on Testnet; these examples do not imply
a Mainnet deployment.

## Deployed Contracts

| Contract | Testnet address |
|----------|-----------------|
| Prediction market | `CAPCAPWPGPOCENAJFYYIE22WYNFEDVZ3CT73M5MAKILFMBQ5TN2MIS6T` |
| Legacy reward asset (pre-rebrand) | `CBYUQUXPGWUQRV7STCV3YPVLWNTFJHKLEAG7LVAOK7H4FIFJGZW5P476` |
| Referral registry | `CCKVUVYXR6FBB4VFYGDF3IDDUVBRJGKPDDRABTZYKI2LKAJNVLF3TTQ2` |
| Leaderboard | `CCMNYMUI4XMDBTTMM7E6KNQFF3OVKS3Q2ERJ4EVQGCLW4VQCGUGG2AQM` |

## Environment

```bash
export STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
export PREDICTION_MARKET_ID="CAPCAPWPGPOCENAJFYYIE22WYNFEDVZ3CT73M5MAKILFMBQ5TN2MIS6T"
```

Market #3's published close date has passed. Inspect the contract and check its
current onchain state before attempting market actions.

These addresses identify existing pre-rebrand Testnet contracts. New builds
initialize the reward asset as Stellar Trade (STRD); they do not change the
identity or metadata of contracts already deployed at these addresses.

## Prediction Market ABI

| Method | Arguments | Result |
|--------|-----------|--------|
| `place_bet` | `user`, `market_id`, `is_yes`, `amount` | Records or increases a YES/NO bet after applying fees. |
| `reduce_position` | `user`, `market_id`, `amount` | Reduces an existing position before market close and refunds proportional stake. |
| `resolve_market` | `caller`, `market_id`, `outcome` | An authorized account resolves the market with a YES/NO outcome. |
| `claim` | `user`, `market_id` | Claims winnings, points, and token rewards for an eligible user. |

## Example: place_bet

Use `place_bet` when a user chooses a side and submits an amount.

```bash
soroban contract invoke \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --id "$PREDICTION_MARKET_ID" \
  --source "$USER_SECRET_KEY" \
  -- \
  place_bet \
  --user "$USER_ADDRESS" \
  --market_id 1 \
  --is_yes true \
  --amount 10000000
```

Notes:
- `market_id` is the numeric market identifier.
- `is_yes=true` places a YES bet; `false` places a NO bet.
- `amount` should be passed in the token's smallest unit.

## Example: reduce_position

Use `reduce_position` before close to reduce an existing position stake.

```bash
soroban contract invoke \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --id "$PREDICTION_MARKET_ID" \
  --source "$USER_SECRET_KEY" \
  -- \
  reduce_position \
  --user "$USER_ADDRESS" \
  --market_id 1 \
  --amount 5000000
```

Notes:
- `market_id` is the numeric market identifier.
- `amount` should be passed in the token's smallest unit (stroops).
- Only valid before the market close time.

## Example: resolve_market

Use `resolve_market` after the event outcome is known. Only an authorized
resolver or admin may submit it; public price feeds do not settle markets.

```bash
soroban contract invoke \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --id "$PREDICTION_MARKET_ID" \
  --source "$ADMIN_SECRET_KEY" \
  -- \
  resolve_market \
  --caller "$ADMIN_ADDRESS" \
  --market_id 1 \
  --outcome true
```

Notes:
- `outcome=true` resolves the market as YES.
- `outcome=false` resolves the market as NO.
- Clients should refresh odds, claim state, and leaderboard rows after
  resolution.

## Example: claim

Use `claim` after a market is resolved and the user is eligible to receive
rewards.

```bash
soroban contract invoke \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$STELLAR_NETWORK_PASSPHRASE" \
  --id "$PREDICTION_MARKET_ID" \
  --source "$USER_SECRET_KEY" \
  -- \
  claim \
  --user "$USER_ADDRESS" \
  --market_id 1
```

Notes:
- The user should claim only once per resolved market.
- The frontend should show a pending state while the transaction is submitted
  and refresh balances after confirmation.

## Raw RPC Shape

When integrating without the CLI, construct a Soroban transaction client-side,
simulate it with the configured RPC server, sign it, submit it, then poll the
transaction status. The application should keep the same argument order as the
contract ABI:

```ts
const placeBetArgs = {
  method: "place_bet",
  args: {
    user: userAddress,
    market_id: 1,
    is_yes: true,
    amount: "10000000",
  },
};

const reducePositionArgs = {
  method: "reduce_position",
  args: {
    user: userAddress,
    market_id: 1,
    amount: "5000000",
  },
};

const resolveMarketArgs = {
  method: "resolve_market",
  args: {
    caller: adminAddress,
    market_id: 1,
    outcome: true,
  },
};

const claimArgs = {
  method: "claim",
  args: {
    user: userAddress,
    market_id: 1,
  },
};
```

## Verification Checklist

- Confirm the RPC URL and network passphrase match the target network.
- Confirm the contract ID is for the same deployment listed in the README.
- Simulate the transaction before signing.
- Submit with the correct source account.
- Refresh market, leaderboard, and wallet state after the transaction succeeds.


## Note on CLI naming

Recent releases of the Soroban CLI ship as `stellar` (the `soroban` binary is a
deprecated alias). The examples above work with both; with a current install
use `stellar contract invoke` with the same flags.

## Example: full RPC round-trip in TypeScript

The `@stellar/stellar-sdk` flow used by the frontend: build the call, simulate
it against RPC, sign the assembled transaction, submit, then poll status.

```ts
import {
  Contract, Keypair, Networks, TransactionBuilder, BASE_FEE,
  nativeToScVal, Address, rpc,
} from "@stellar/stellar-sdk";

const server = new rpc.Server(process.env.STELLAR_RPC_URL!);
const contract = new Contract(process.env.PREDICTION_MARKET_ID!);
const keypair = Keypair.fromSecret(process.env.USER_SECRET_KEY!);

const account = await server.getAccount(keypair.publicKey());

const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
})
  .addOperation(contract.call(
    "place_bet",
    Address.fromString(keypair.publicKey()).toScVal(), // user
    nativeToScVal(1n, { type: "u64" }),                // market_id
    nativeToScVal(true),                               // is_yes
    nativeToScVal(10_000_000n, { type: "i128" }),      // amount (stroops)
  ))
  .setTimeout(60)
  .build();

const prepared = await server.prepareTransaction(tx); // simulates + adds footprint
prepared.sign(keypair);

const sent = await server.sendTransaction(prepared);
let status = await server.getTransaction(sent.hash);
while (status.status === "NOT_FOUND") {
  await new Promise((r) => setTimeout(r, 1000));
  status = await server.getTransaction(sent.hash);
}
console.log(status.status); // SUCCESS | FAILED
```

`reduce_position`, `resolve_market`, and `claim` follow the same pattern with their argument lists
from the ABI table (`reduce_position`: user address, `u64` market id, `i128`
amount; `resolve_market`: caller address, `u64` market id, `bool`
outcome; `claim`: user address, `u64` market id).

## Read-only queries (no signing)

View methods can be read through simulation only, without signing or
submitting:

```ts
const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
})
  .addOperation(contract.call("get_market", nativeToScVal(1n, { type: "u64" })))
  .setTimeout(30)
  .build();

const sim = await server.simulateTransaction(tx);
if (rpc.Api.isSimulationSuccess(sim)) {
  console.log(sim.result?.retval); // decode with scValToNative
}
```

Useful view methods: `get_market(market_id)`, `get_bet(market_id, user)`,
`get_market_count()`, `get_market_bettors(market_id)`,
`get_user_bet_count(market_id, user)`.

## Contract error codes

Failed invocations trap with a `MarketError` code. The full mapping from
`contracts/prediction_market/src/lib.rs`:

| Code | Error | Typical cause |
|------|-------|---------------|
| 1 | AlreadyInitialized | `initialize` called twice |
| 2 | NotInitialized | Contract used before `initialize` |
| 3 | NotAdmin | Admin-only method called by non-admin |
| 4 | MarketNotFound | Unknown `market_id` |
| 5 | MarketExpired | Bet placed after market end |
| 6 | MarketNotExpired | Resolving before market end |
| 7 | MarketResolved | Acting on an already-resolved market |
| 8 | MarketCancelled | Acting on a cancelled market |
| 9 | MarketNotResolved | `claim` before resolution |
| 10 | BetTooSmall | Amount below minimum bet |
| 11 | OppositeSideBet | User already bet the other side |
| 12 | AlreadyClaimed | Second `claim` for the same market |
| 13 | NoBetFound | `claim` without a bet |
| 14 | InvalidAmount | Zero/negative amount |
| 15 | NoFeesToWithdraw | Fee withdrawal with empty balance |
| 16 | NotResolver | `resolve_market` by non-resolver |
| 17 | TooManyBets | Per-user bet cap reached |
| 18 | NotAuthorized | Caller not permitted |
| 19 | MarketNotCancelled | Refund on a non-cancelled market |
| 20 | RateLimitExceeded | Too many operations in a window |
