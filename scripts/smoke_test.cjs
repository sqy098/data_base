const fs = require("fs");
const vm = require("vm");

const dataSource = fs.readFileSync(process.argv[2] || "site/data.js", "utf8");
const appSource = fs.readFileSync(process.argv[3] || "site/app.js", "utf8");

function fakeElement(id) {
  return {
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    dataset: {},
    listeners: {},
    classList: { toggle() {} },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
}

function render(hash) {
  const elements = {
    "view": fakeElement("view"),
    "updated-at": fakeElement("updated-at"),
    "kpi-grid": fakeElement("kpi-grid"),
    "combined-note": fakeElement("combined-note"),
    "ranking-results": fakeElement("ranking-results"),
    "match-results": fakeElement("match-results"),
    "match-count": fakeElement("match-count"),
  };
  const controls = {
    rankingQuery: fakeElement("ranking-query"),
    matchQuery: fakeElement("match-query"),
    matchStatus: fakeElement("match-status"),
  };
  controls.matchStatus.value = "全部";
  elements.view.querySelector = (selector) => ({
    "[data-ranking-query]": controls.rankingQuery,
    "[data-match-query]": controls.matchQuery,
    "[data-match-status]": controls.matchStatus,
  })[selector] || null;

  const document = {
    getElementById(id) { return elements[id]; },
    querySelectorAll() { return []; },
  };
  const window = { location: { hash }, scrollTo() {} };
  const context = vm.createContext({
    window,
    document,
    history: { replaceState() {} },
    console,
    Set,
  });
  vm.runInContext(dataSource, context, { filename: "data.js" });
  vm.runInContext(appSource, context, { filename: "app.js" });
  return { elements, controls, data: window.DASHBOARD_DATA };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const overview = render("#overview");
assert((overview.elements["kpi-grid"].innerHTML.match(/kpi-card/g) || []).length === 6, "Expected six KPI cards");
assert(overview.elements["kpi-grid"].innerHTML.includes("1,779"), "Expected latest match count");
assert(overview.elements.view.innerHTML.includes("近 6 个月让球盈亏"), "Overview chart missing");

const league = render("#league");
assert(league.elements.view.innerHTML.includes("让球盈亏排名"), "League view missing");
assert(league.elements["ranking-results"].innerHTML.includes("ranking-row"), "League rankings missing");

const team = render("#team");
assert(team.elements.view.innerHTML.includes("球队维度"), "Team view missing");
assert(team.elements["ranking-results"].innerHTML.includes("ranking-row"), "Team rankings missing");

const matches = render("#matches");
assert((matches.elements["match-results"].innerHTML.match(/match-card/g) || []).length === 50, "Expected 50 match cards");
assert(matches.elements["match-results"].innerHTML.includes("让球</span><b>待复核"), "Pending handicap badge is missing");
assert(matches.elements["match-results"].innerHTML.includes("大小球</span><b>待复核"), "Pending total badge is missing");
assert(matches.elements["match-results"].innerHTML.includes("让球</span><b>赢"), "Settled handicap badge is missing");
assert(matches.elements["match-results"].innerHTML.includes("大小球</span><b>赢半"), "Settled total badge is missing");
matches.controls.matchQuery.value = "浙江队";
matches.controls.matchQuery.listeners.input();
assert(matches.elements["match-results"].innerHTML.includes("青岛海牛"), "Latest Zhejiang match is missing");
assert(matches.elements["match-count"].textContent.startsWith("显示 1 / 50"), "Match search count is wrong");

console.log(JSON.stringify({
  ok: true,
  totals: matches.data.totals,
  latestMatches: matches.data.matches.length,
  zhejiangMatch: true,
  views: ["overview", "league", "team", "matches"],
}));
