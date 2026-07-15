const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dataPath = path.resolve(process.argv[2] || "site/data.js");
const appPath = path.resolve(process.argv[3] || "site/app.js");
const siteDir = path.dirname(dataPath);
const dataSource = fs.readFileSync(dataPath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");
const indexSource = fs.readFileSync(path.join(siteDir, "index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(siteDir, "styles.css"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(siteDir, "workbook", "manifest.json"), "utf8"));
const workbookSheets = Object.fromEntries(
  manifest.sheets.map((sheet) => [
    sheet.slug,
    JSON.parse(fs.readFileSync(path.join(siteDir, "workbook", path.basename(sheet.file)), "utf8")),
  ])
);

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
assert(overview.elements.view.innerHTML.includes("23:30"), "Rolling-window settlement time is missing");
assert(overview.elements.view.innerHTML.includes("上一完整19点窗口"), "Rolling-window settlement description is missing");

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
assert(matches.elements.view.innerHTML.includes("未结算：优先看赛前推荐"), "Match-stage legend is missing");
assert(matches.elements["match-results"].innerHTML.includes("赛前结论"), "Unsettled recommendation summary is missing");
assert(matches.elements["match-results"].innerHTML.includes("FK贝尔格莱德 -1.25"), "Latest unsettled recommendation is missing");
assert(matches.elements["match-results"].innerHTML.includes("让球结算"), "Settled handicap summary is missing");
assert(matches.elements["match-results"].innerHTML.includes("大小球结算"), "Settled total summary is missing");
assert(matches.elements["match-results"].innerHTML.includes("终场比分"), "Settled score highlight is missing");
matches.controls.matchQuery.value = "浙江队";
matches.controls.matchQuery.listeners.input();
assert(matches.elements["match-results"].innerHTML.includes("青岛海牛"), "Latest Zhejiang match is missing");
assert(matches.elements["match-count"].textContent.startsWith("显示 1 / 50"), "Match search count is wrong");

assert(indexSource.includes('data-tab="workbook"'), "Full-workbook navigation is missing");
assert(appSource.includes("async function renderWorkbook()"), "Full-workbook renderer is missing");
assert(appSource.includes("workbookDecoratedValue(header, row.cells[index])"), "Ledger result decoration is missing");
assert(styleSource.includes(".workbook-result-pill.is-win") && styleSource.includes(".workbook-result-pill.is-loss"), "Ledger win/loss colors are missing");
assert(manifest.validation.records === 1779, "Workbook record validation is wrong");
assert(manifest.validation.descending === true, "Workbook descending validation is missing");
assert(/^[a-f0-9]{64}$/.test(manifest.sha256), "Workbook SHA-256 is invalid");
assert(manifest.sheets.length === 4, "Expected four workbook sheets");
assert(["dashboard", "matches", "dictionary", "dimensions"].every((slug) => workbookSheets[slug]), "A workbook sheet export is missing");
assert(workbookSheets.matches.headerRow === 4 && workbookSheets.matches.dataStartRow === 5, "Ledger header metadata is wrong");
assert(workbookSheets.matches.rows.filter((row) => row.number >= 5).length === 1779, "Full ledger export is incomplete");
assert(workbookSheets.matches.rows.find((row) => row.number === 4).cells.includes("状态"), "Ledger status column is missing");
assert(workbookSheets.dictionary.rows.length >= 150, "Event dictionary export is incomplete");
assert(workbookSheets.dimensions.rowCount === 1305 && workbookSheets.dimensions.rows.length >= 1200, "Dimension record export is incomplete");

console.log(JSON.stringify({
  ok: true,
  totals: matches.data.totals,
  latestMatches: matches.data.matches.length,
  fullWorkbookMatches: manifest.validation.records,
  workbookSheets: manifest.sheets.map((sheet) => sheet.name),
  zhejiangMatch: true,
  views: ["overview", "league", "team", "matches", "workbook"],
}));
