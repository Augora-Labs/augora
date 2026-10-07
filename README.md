# Stellar Trade

Stellar Trade is an open-source prediction market prototype built with Soroban on Stellar. Participants buy a YES or NO position on a clear market question, then inspect pooled XLM settlement on the public ledger. They can sell by reducing an open position before the market closes.

Markets make forecasts concrete: participants commit value, market rules define when a question closes, and settlement follows a recorded outcome. The contracts support proportional pool payouts, market-scoped fee accounting, cancellation refunds, referral rewards, and an onchain record of forecasting performance. The current prototype uses authorized resolvers, so resolver accountability and evidence are central parts of the product roadmap.

## Why build this on Stellar?

Stellar offers a public ledger and Soroban smart contracts for low-friction asset movement and settlement. Stellar Trade uses those properties to make the path from position to payout inspectable. The goal is to help communities, builders, and ecosystem participants coordinate around questions that matter to them, while keeping the rules and settlement logic open for review.

## What the prototype is proving

The core experiment is whether a small market can make its question, stake, fees, and final payout understandable to participants. The contracts and tests cover the settlement mechanics; the browser app demonstrates a wallet transaction path. The current market catalog and rankings are illustrative, and the configured Testnet market has expired. This is an early-stage prototype, not a live production market or audited financial product.

The next milestones are to load market terms and status directly from Soroban, publish objective resolution criteria and evidence, connect rankings to contract data, and complete an independent security review before any production launch.

## Buy and sell actions

**Buy** adds an XLM stake to the selected YES or NO outcome. **Sell** reduces the participant's existing position through the contract's `reduce_position` operation; the contract calculates the refund from the amount reduced and applicable fee rules. Sell does not transfer a position to another trader or open a short position. The current deployed Testnet market is expired, so it accepts neither action. Concept markets run in local simulation mode and move no funds.

## What works today

- Four Soroban contracts for prediction markets, a reward asset, referrals, and rankings, plus cross-contract invariant tests. The Rust workspace lives in the adjacent [`stellar-trade-contracts`](../stellar-trade-contracts) repository.
- A static browser app with public Stellar mainnet and XLM price data, Freighter wallet connection, transaction builders for Testnet buys and position reductions, confirmation polling, and explorer links. The configured Testnet market is expired, so those transactions cannot currently be submitted against it.
- Deployed Testnet contracts. The configured market #3 was published to close on September 30, 2026. That date has passed; the app does not yet read current market resolution state or load market terms from the contract. The wallet integration demonstrates the transaction path; no position can currently be placed in that market.
- Market catalog and leaderboard pages that illustrate the product direction. Their sample odds and rankings are explicitly labeled and are not live contract data.

Testnet contract IDs:

| Contract | Testnet address |
| --- | --- |
| Prediction market | `CAPCAPWPGPOCENAJFYYIE22WYNFEDVZ3CT73M5MAKILFMBQ5TN2MIS6T` |
| Legacy reward asset (pre-rebrand) | `CBYUQUXPGWUQRV7STCV3YPVLWNTFJHKLEAG7LVAOK7H4FIFJGZW5P476` |
| Referral registry | `CCKVUVYXR6FBB4VFYGDF3IDDUVBRJGKPDDRABTZYKI2LKAJNVLF3TTQ2` |
| Leaderboard | `CCMNYMUI4XMDBTTMM7E6KNQFF3OVKS3Q2ERJ4EVQGCLW4VQCGUGG2AQM` |

Inspect transactions and contracts on [Stellar Expert Testnet](https://stellar.expert/explorer/testnet).

The IDs above are existing pre-rebrand Testnet deployments. Fresh deployments
from this source initialize the reward asset as **Stellar Trade (STRD)** and
produce new contract IDs. The new reward asset has not been deployed; old
holders and contracts continue to refer to the legacy asset at its existing ID.

## Run the frontend

The site uses plain HTML, CSS, and JavaScript; it has no bundler or npm build step. From `stellar-trade/`:

```bash
python3 -m http.server 8080 --directory frontend
```

Open `http://localhost:8080`. Connect Freighter on **Testnet** to explore the wallet flow. Use Testnet assets only; they have no mainnet value. A browser session stores the visible position history locally.

## Contracts and checks

From `stellar-trade-contracts/`, install Rust 1.91.0 and the `wasm32v1-none` target. Run:

```bash
cargo test --workspace --all-features
cargo fmt --all -- --check
cargo clippy --workspace --all-features -- -D warnings
```

Review [`INVARIANT_MATRIX.md`](../stellar-trade-contracts/INVARIANT_MATRIX.md) before changing fees, reward values, storage lifetimes, or payout rules. Frontend CI checks page assets and JavaScript syntax with Node.js 22.

## Design and roadmap

The protocol uses pooled stakes: winning positions share the pool proportionally, while per-market fee ledgers keep funds traceable across settlement and cancellation. Contract tests exercise payout conservation, referral flow, reward accounting, and cross-contract pause behavior.

Resolution currently uses authorized accounts. Public price and network feeds are informational; they do not resolve markets automatically. The next product work is to read market terms and status from the contracts, provide verifiable resolution criteria and evidence, and connect the market catalog and rankings to onchain data. Clear separation between live, expired, and illustrative data is a product requirement.

## Security and license

Never commit `.deploy.env`, secret keys, recovery phrases, local wallet identities, or generated deployment output. The wallet integration asks Freighter to sign and never asks the browser to handle a secret key. Testnet software and assets are experimental and carry no mainnet value. Licensed under MIT.
