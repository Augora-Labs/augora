// Zero-dependency DOM harness for running frontend/script.js under `node --test`
// in repositories that do not use package.json / node_modules.

class ClassList {
  constructor(el, initial = "") {
    this._el = el;
    this._set = new Set(initial.split(/\s+/).filter(Boolean));
  }
  add(...names) {
    for (const n of names) if (n) this._set.add(n);
    this._sync();
  }
  remove(...names) {
    for (const n of names) this._set.delete(n);
    this._sync();
  }
  toggle(name, force) {
    const has = this._set.has(name);
    const shouldHave = force === undefined ? !has : Boolean(force);
    if (shouldHave) this._set.add(name);
    else this._set.delete(name);
    this._sync();
    return shouldHave;
  }
  contains(name) {
    return this._set.has(name);
  }
  toString() {
    return [...this._set].join(" ");
  }
  _sync() {
    this._el._attrs.set("class", this.toString());
  }
}

export class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.defaultPrevented = false;
    this.target = init.target ?? null;
    this.currentTarget = null;
    this.key = init.key ?? "";
  }
  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
}

function toCamelCase(kebab) {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export class MockElement {
  constructor(tagName = "div", attrs = {}, parent = null, ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.parentElement = parent;
    this.ownerDocument = ownerDocument;
    this._attrs = new Map(Object.entries(attrs));
    this.dataset = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("data-")) {
        this.dataset[toCamelCase(k.slice(5))] = v;
      }
    }
    this.classList = new ClassList(this, attrs.class || "");
    this.style = {};
    this.hidden = Boolean(attrs.hidden !== undefined && attrs.hidden !== false);
    this.disabled = Boolean(attrs.disabled !== undefined && attrs.disabled !== false);
    this.value = attrs.value ?? "";
    this._textContent = attrs.textContent ?? "";
    this._innerHTML = "";
    this.children = [];
    this._listeners = new Map();
  }

  get id() {
    return this._attrs.get("id") || "";
  }
  set id(v) {
    this._attrs.set("id", String(v));
  }

  get className() {
    return this.classList.toString();
  }
  set className(v) {
    this.classList = new ClassList(this, String(v));
    this._attrs.set("class", String(v));
  }

  get href() {
    return this._attrs.get("href") || "";
  }
  set href(v) {
    this._attrs.set("href", String(v));
  }

  get textContent() {
    if (this.children.length > 0 && !this._textContent) {
      return this.children.map((c) => c.textContent).join("");
    }
    return this._textContent;
  }
  set textContent(v) {
    this._textContent = String(v ?? "");
  }

  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(html) {
    this._innerHTML = String(html ?? "");
    this.children = parseSimpleChildren(this._innerHTML, this, this.ownerDocument);
  }

  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }
  setAttribute(name, value) {
    const str = String(value);
    this._attrs.set(name, str);
    if (name === "class") {
      this.classList = new ClassList(this, str);
    } else if (name.startsWith("data-")) {
      this.dataset[toCamelCase(name.slice(5))] = str;
    }
  }

  appendChild(child) {
    child.parentElement = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    const idx = this.parentElement.children.indexOf(this);
    if (idx !== -1) this.parentElement.children.splice(idx, 1);
    this.parentElement = null;
  }

  focus() {}
  scrollIntoView() {}

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }

  removeEventListener(type, fn) {
    const list = this._listeners.get(type);
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    const list = [...(this._listeners.get(event.type) || [])];
    const tasks = [];
    for (const fn of list) {
      const res = fn.call(this, event);
      if (res && typeof res.then === "function") tasks.push(res);
    }
    this._lastDispatchPromise = Promise.all(tasks);
    return !event.defaultPrevented;
  }

  click() {
    const ev = new MockEvent("click", { bubbles: true, cancelable: true, target: this });
    return this.dispatchEvent(ev);
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let cur = this;
    while (cur) {
      if (matchesSelector(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
    const results = [];
    function visit(node) {
      for (const child of node.children) {
        if (parts.some((p) => matchesSelector(child, p))) {
          results.push(child);
        }
        visit(child);
      }
    }
    visit(this);
    return results;
  }
}

function matchesSelector(el, selector) {
  const s = selector.trim();
  if (s.startsWith("#")) {
    return el.id === s.slice(1);
  }
  if (s.startsWith(".")) {
    return el.classList.contains(s.slice(1));
  }
  const attrMatch = s.match(/^([a-zA-Z0-9_-]*)\[([a-zA-Z0-9_-]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
  if (attrMatch) {
    const [, tag, attr, val] = attrMatch;
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (!el._attrs.has(attr)) return false;
    if (val !== undefined && el._attrs.get(attr) !== val) return false;
    return true;
  }
  return el.tagName === s.toUpperCase();
}

function parseSimpleChildren(html, parent, ownerDocument) {
  const out = [];
  if (html.includes("<span></span>")) {
    out.push(new MockElement("span", {}, parent, ownerDocument));
  }
  const articleMatches = [...html.matchAll(/<article\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  for (const m of articleMatches) {
    const article = new MockElement("article", { class: m[1] }, parent, ownerDocument);
    const catMatch = m[2].match(/<span class="category">([^<]+)<\/span>/);
    if (catMatch) {
      article.appendChild(new MockElement("span", { class: "category", textContent: catMatch[1] }, article, ownerDocument));
    }
    const titleMatch = m[2].match(/<h3>([^<]+)<\/h3>/);
    if (titleMatch) {
      article.appendChild(new MockElement("h3", { textContent: titleMatch[1] }, article, ownerDocument));
    }
    const btnMatch = m[2].match(/<button[^>]*data-trade-index="(\d+)"[^>]*>/);
    if (btnMatch) {
      article.appendChild(
        new MockElement("button", { class: "trade-link", "data-trade-index": btnMatch[1] }, article, ownerDocument),
      );
    }
    out.push(article);
  }
  return out;
}

export function installAugoraDom() {
  const docListeners = new Map();
  const root = new MockElement("html");
  const body = new MockElement("body", {}, root);
  root.appendChild(body);

  function add(tag, attrs = {}, parent = body) {
    const el = new MockElement(tag, attrs, parent);
    parent.appendChild(el);
    return el;
  }

  const navWrap = add("div", { class: "container nav-wrap" });
  add("button", { class: "menu-button", "aria-expanded": "false", "aria-label": "Open navigation" }, navWrap);
  const siteNav = add("nav", { id: "main-navigation", class: "site-nav" }, navWrap);
  add("a", { href: "markets.html" }, siteNav);
  add("a", { href: "#trade" }, siteNav);
  add("button", { id: "connect-wallet", class: "wallet-button" }, navWrap);

  add("span", { id: "connection-label" });
  add("time", { id: "last-updated" });
  add("strong", { id: "xlm-price" });
  add("span", { id: "xlm-change" });
  add("div", { id: "price-chart" });
  add("strong", { id: "price-range" });
  add("span", { id: "network-state" });
  add("strong", { id: "latest-ledger" });
  add("strong", { id: "ledger-age" });
  add("strong", { id: "operation-count" });

  // Filter buttons (#44)
  const filterGroup = add("div", { class: "filter-group" });
  add("button", { class: "active", "data-filter": "all", textContent: "All" }, filterGroup);
  add("button", { "data-filter": "crypto", textContent: "Crypto" }, filterGroup);
  add("button", { "data-filter": "network", textContent: "Network" }, filterGroup);
  add("div", { id: "market-list", class: "market-grid" });

  // Trade section (#46)
  const tradeSection = add("section", { id: "trade" });
  add("span", { id: "trade-mode" }, tradeSection);
  add("span", { id: "trade-category" }, tradeSection);
  add("h3", { id: "trade-title" }, tradeSection);
  add("span", { id: "trade-status" }, tradeSection);
  add("p", { id: "trade-detail" }, tradeSection);
  add("strong", { id: "trade-close" }, tradeSection);
  add("strong", { id: "trade-probability" }, tradeSection);
  const largeProb = add("div", { class: "large-probability" }, tradeSection);
  add("span", { id: "trade-probability-bar" }, largeProb);

  const orderForm = add("form", { id: "order-form" }, tradeSection);
  add("button", { type: "button", class: "active", "data-action": "buy", "aria-pressed": "true" }, orderForm);
  add("button", { type: "button", "data-action": "sell", "aria-pressed": "false" }, orderForm);
  const outcomeFieldset = add("fieldset", { id: "outcome-fieldset" }, orderForm);
  const yesBtn = add("button", { type: "button", class: "active", "data-outcome": "yes", "aria-pressed": "true" }, outcomeFieldset);
  add("strong", { id: "yes-price" }, yesBtn);
  const noBtn = add("button", { type: "button", "data-outcome": "no", "aria-pressed": "false" }, outcomeFieldset);
  add("strong", { id: "no-price" }, noBtn);
  add("p", { id: "sell-note", hidden: true }, orderForm);
  add("span", { id: "amount-label-text" }, orderForm);
  add("input", { id: "stake-amount", value: "100" }, orderForm);
  add("button", { type: "button", "data-amount": "25" }, orderForm);
  add("button", { type: "button", "data-amount": "50" }, orderForm);
  add("button", { type: "button", "data-amount": "100" }, orderForm);
  add("button", { type: "button", "data-amount": "250" }, orderForm);
  const buySummary = add("dl", { id: "buy-summary" }, orderForm);
  add("dd", { id: "average-price" }, buySummary);
  add("dd", { id: "potential-return" }, buySummary);
  add("dd", { id: "potential-profit" }, buySummary);
  const sellSummary = add("dl", { id: "sell-summary", hidden: true }, orderForm);
  add("dd", { id: "sell-refund" }, sellSummary);
  const submitBtn = add("button", { id: "submit-order", type: "submit" }, orderForm);
  add("span", { id: "submit-order-label", textContent: "Buy position" }, submitBtn);
  add("p", { id: "order-disclaimer" }, orderForm);

  const activity = add("section", { id: "activity" });
  add("button", { class: "active", "data-dashboard": "positions" }, activity);
  add("button", { "data-dashboard": "feed" }, activity);
  const posView = add("div", { id: "positions-view" }, activity);
  add("div", { id: "position-list" }, posView);
  add("div", { id: "feed-view", hidden: true }, activity);
  add("a", { "data-contract-explorer": "" });
  add("span", { id: "year" });

  const storageMap = new Map();
  const sessionStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  };

  const document = {
    body,
    hidden: true, // Prevent background polling timers from firing during unit tests
    createElement: (tag) => new MockElement(tag, {}, null, document),
    querySelector: (sel) => root.querySelector(sel),
    querySelectorAll: (sel) => root.querySelectorAll(sel),
    addEventListener: (type, fn) => {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener: (type, fn) => {
      const list = docListeners.get(type);
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    },
  };

  const windowObj = {
    document,
    sessionStorage,
    requestAnimationFrame: (cb) => cb(),
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  };

  globalThis.window = windowObj;
  globalThis.document = document;
  globalThis.sessionStorage = sessionStorage;
  globalThis.requestAnimationFrame = windowObj.requestAnimationFrame;
  globalThis.Event = MockEvent;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/ledgers")) {
      return {
        ok: true,
        json: async () => ({
          _embedded: {
            records: [{ sequence: 55000000, closed_at: new Date().toISOString(), operation_count: 42 }],
          },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        stellar: { usd: 0.42, usd_24h_change: 1.5 },
        prices: [
          [Date.now() - 3600000, 0.41],
          [Date.now(), 0.42],
        ],
      }),
    };
  };

  return { window: windowObj, document, sessionStorage };
}
