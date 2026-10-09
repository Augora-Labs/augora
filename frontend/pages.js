const pageMarkets = [
  { category: "crypto", title: "Will XLM close above $0.50 this month?", yes: 54, close: "Month end" },
  { category: "network", title: "Will Stellar pass 70 million ledgers this year?", yes: 68, close: "Dec 31" },
  { category: "network", title: "Will average ledger close stay below 6 seconds?", yes: 76, close: "7-day window" },
  { category: "crypto", title: "Will XLM gain 10% over the next seven days?", yes: 47, close: "7 days" },
  { category: "network", title: "Will mainnet process 100+ operations in one ledger?", yes: 61, close: "24 hours" },
  { category: "crypto", title: "Will XLM outperform Bitcoin this month?", yes: 43, close: "Month end" },
];

let activeFilter = "all";
function drawMarkets() {
  const list = document.querySelector("#all-market-list");
  if (!list) return;
  const query = (document.querySelector("#market-search")?.value || "").toLowerCase();
  const items = pageMarkets.filter((market) => (activeFilter === "all" || market.category === activeFilter)
    && market.title.toLowerCase().includes(query));
  list.innerHTML = items.map((market) => `<article class="market-card">
    <div class="market-card-header"><span class="category">${market.category}</span><span class="market-badge">Illustration</span></div>
    <h3>${market.title}</h3><p>Example market question. Resolution criteria and a live market pool are not configured for this preview.</p>
    <div class="probability" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${market.yes}" aria-valuetext="Sample ${market.yes}% Yes" aria-label="Illustrative probability only"><span style="width:${market.yes}%" aria-hidden="true"></span></div>
    <div class="outcomes"><strong class="yes">Sample ${market.yes}%</strong><strong class="no">Sample ${100 - market.yes}%</strong></div>
    <div class="market-card-action"><span class="market-close">Example close: ${market.close}</span><a class="trade-link" href="index.html#trade">View Testnet market →</a></div>
  </article>`).join("") || '<div class="no-results">No markets match your search.</div>';
}

document.querySelector("#market-search")?.addEventListener("input", drawMarkets);
document.querySelectorAll("[data-page-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-page-filter]").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.pageFilter;
  drawMarkets();
}));
drawMarkets();

const sampleLeaders = [
  { name: "NovaSignal", address: "GC5D…KSL7", points: 1250, accuracy: 78, bets: 42 },
  { name: "OrbitEdge", address: "GD5N…5FXC", points: 980, accuracy: 72, bets: 34 },
  { name: "LedgerLens", address: "GDL7…4WIH", points: 740, accuracy: 69, bets: 29 },
  { name: "XLMetrics", address: "GBPM…6LPY", points: 620, accuracy: 65, bets: 38 },
  { name: "MarketSignal", address: "GAVJ…6JKV", points: 540, accuracy: 61, bets: 25 },
];
const leaderList = document.querySelector("#leader-list");
if (leaderList) leaderList.innerHTML = sampleLeaders.map((player, index) => `<div class="leader-row">
  <div class="leader-person"><span class="rank">${String(index + 1).padStart(2, "0")}</span><span class="avatar">${player.name.slice(0, 2).toUpperCase()}</span><div><strong>${player.name}</strong><small>${player.address}</small></div></div>
  <strong>${player.points.toLocaleString()}</strong><span>${player.accuracy}%</span><span>${player.bets}</span>
</div>`).join("");
