const STORAGE_KEY = "churn-macros-v1";

const PRODUCT_SUGGESTIONS = [
  "Spend",
  "Review Cycles",
  "Devices",
  "App Management",
  "Time & Attendance",
  "Recruiting",
  "Learning Management",
  "Surveys",
  "Headcount Planning",
  "Compensation",
];

const MISSING = {
  customerName: "Customer name",
  companyDba: "Company DBA",
  peoTermination: "PEO termination date",
  accountClosure: "Account closure date",
  finalPayroll: "Final payroll date",
  finalPayRun: "Final pay run date",
  lastQuarterly: "Last quarterly filing",
  lastAnnual: "Last annual filing",
  logoChurn: "Logo churn date",
  docAccess: "Document access end",
  benefits: "offering or not offering",
  cobraVerb: "will or will not",
  firstName: "Requester first name",
  billingEnd: "Billing end date",
  churnQuarter: "Last quarterly tax filing",
  churnAnnual: "Last annual tax filing",
  cancelBy: "Cancellation deadline",
  products: "Product list",
};

const $ = (id) => document.getElementById(id);

const els = {
  customerName: $("customer-name"),
  firstName: $("first-name"),
  companyDba: $("company-dba"),
  agentName: $("agent-name"),
  signoffStyle: $("signoff-style"),
  peoTermination: $("peo-termination"),
  accountClosure: $("account-closure"),
  finalPayroll: $("final-payroll"),
  finalPayRun: $("final-pay-run"),
  finalPayRunSame: $("final-pay-run-same"),
  logoChurn: $("logo-churn"),
  logoSame: $("logo-same"),
  docAccess: $("doc-access"),
  docAccessAuto: $("doc-access-auto"),
  peoQuarter: $("peo-quarter"),
  peoAnnual: $("peo-annual"),
  includeCobra: $("include-cobra"),
  cobraUrl: $("cobra-url"),
  helpUrl: $("help-url"),
  billingEnd: $("billing-end"),
  cancelBy: $("cancel-by"),
  cancelByAuto: $("cancel-by-auto"),
  churnQuarter: $("churn-quarter"),
  churnAnnual: $("churn-annual"),
  includeProducts: $("include-products"),
  productInput: $("product-input"),
  productList: $("product-list"),
  productTools: $("product-tools"),
  includeRefund: $("include-refund"),
  refundOptions: $("refund-options"),
  subject: $("subject"),
  letter: $("letter"),
  readiness: $("readiness"),
  previewKicker: $("preview-kicker"),
  toast: $("toast"),
};

const state = {
  tab: "peo",
  firstNameTouched: false,
  subjectTouched: { peo: false, churn: false },
  products: [],
};

function addDays(iso, days) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatLong(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function blank(value, label) {
  const text = String(value || "").trim();
  return text || `[${label}]`;
}

function isBlank(value) {
  return /^\[.+\]$/.test(String(value || "").trim());
}

const MISSING_TOKENS = Object.values(MISSING).map((label) => `[${label}]`);

function countBlanks(text) {
  return MISSING_TOKENS.reduce((count, token) => count + text.split(token).length - 1, 0);
}

function selectedBenefits() {
  const picked = document.querySelector('input[name="benefits"]:checked');
  return picked ? picked.value : "";
}

function refundScope() {
  const picked = document.querySelector('input[name="refund-scope"]:checked');
  return picked ? picked.value : "rest of the contract period";
}

function firstToken(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function syncDerivedDates() {
  if (els.finalPayRunSame.checked) els.finalPayRun.value = els.finalPayroll.value;
  if (els.logoSame.checked) els.logoChurn.value = els.accountClosure.value;
  if (els.docAccessAuto.checked) els.docAccess.value = addDays(els.logoChurn.value, 30);
  if (els.cancelByAuto.checked) els.cancelBy.value = addDays(els.billingEnd.value, -2);

  els.finalPayRun.disabled = els.finalPayRunSame.checked;
  els.logoChurn.disabled = els.logoSame.checked;
  els.docAccess.disabled = els.docAccessAuto.checked;
  els.cancelBy.disabled = els.cancelByAuto.checked;
}

function syncBenefits() {
  const benefits = selectedBenefits();
  if (benefits === "not-offering") {
    els.includeCobra.disabled = false;
    if (!state.cobraTouched) els.includeCobra.checked = true;
  } else if (benefits === "offering") {
    els.includeCobra.checked = false;
    els.includeCobra.disabled = true;
    state.cobraTouched = false;
  } else {
    els.includeCobra.checked = false;
    els.includeCobra.disabled = true;
  }
}

function syncFirstName() {
  if (!state.firstNameTouched) els.firstName.value = firstToken(els.customerName.value);
}

function defaultSubject(tab) {
  const dba = els.companyDba.value.trim();
  if (tab === "peo") {
    return dba ? `Rippling PEO termination — ${dba}` : "Rippling PEO termination";
  }
  return dba ? `Your Rippling account closure is finalized — ${dba}` : "Your Rippling account closure is finalized";
}

function syncSubject() {
  if (!state.subjectTouched[state.tab]) els.subject.value = defaultSubject(state.tab);
}

function signoffLines() {
  const name = els.agentName.value.trim();
  const style = els.signoffStyle.value;
  if (style === "none" || !name) return [];
  if (style === "regards") return ["", "Best regards,", name];
  return ["", name];
}

function helpSentence() {
  const url = els.helpUrl.value.trim();
  const base = "Helpful article for your reference on how to view and export your company's data and documents stored in Rippling after an account closure request";
  return url ? `${base}: ${url}` : `${base}?`;
}

function cobraBlock() {
  const url = els.cobraUrl.value.trim();
  const article = `COBRA administrative fees for companies that leave Rippling PEO${url ? `: ${url}` : ""}.`;
  return [
    'If you are not offering healthcare benefits to your employees following termination from Rippling PEO, and COBRA participants remain on Rippling PEO-sponsored COBRA coverage after Rippling PEO contract termination, Rippling will charge you the following PEO COBRA Orphan Access fees per Rippling PEO Terms of Service, section 11.4 "Replacement Coverage":',
    "",
    "One-time $5,000 fee per company.",
    "Monthly $1,000 fee per employee and/or dependent COBRA participant charged on the first day of each month, for each employee and/or dependent enrolled in Rippling PEO-sponsored COBRA coverage following the termination of your Rippling PEO contract.",
    `COBRA administration fees will still apply in the case that you terminate your Rippling PEO contract due to business closure. Please see this Help Center article for additional details: ${article}`,
  ].join("\n");
}

function buildPeo() {
  const benefits = selectedBenefits();
  const offeringPhrase = benefits === "offering" ? "offering" : benefits === "not-offering" ? "not offering" : `[${MISSING.benefits}]`;
  const cobraPhrase = benefits === "offering" ? "will not" : benefits === "not-offering" ? "will" : `[${MISSING.cobraVerb}]`;
  const dba = blank(els.companyDba.value, MISSING.companyDba);
  const lines = [
    `Hi ${blank(els.customerName.value, MISSING.customerName)},`,
    "",
    `I want to reach out to share that your Rippling PEO for the company ${dba} will be terminated with these details:`,
    "",
    `PEO termination date: ${blank(formatLong(els.peoTermination.value), MISSING.peoTermination)}`,
    `Account closure date: ${blank(formatLong(els.accountClosure.value), MISSING.accountClosure)}`,
    `Final payroll with Rippling: ${blank(formatLong(els.finalPayroll.value), MISSING.finalPayroll)}`,
    `Last quarterly filing by Rippling: ${blank(els.peoQuarter.value, MISSING.lastQuarterly)}`,
    `Last annual filing by Rippling: ${blank(els.peoAnnual.value, MISSING.lastAnnual)}`,
    `${dba} is ${offeringPhrase} new healthcare benefits to their employees following their termination from Rippling PEO. Consequently, Rippling ${cobraPhrase} provide PEO COBRA coverage to their worksite employees – both active & terminated, as outlined in Rippling PEO Terms of Service, section 11.4 "Replacement Coverage."`,
    "",
    `You will receive an email from Rippling titled "[IMPORTANT] ${dba} - Information About Offboarding" with all the offboarding information on ${blank(formatLong(els.finalPayRun.value), MISSING.finalPayRun)}. An export is enabled in Rippling then, allowing you to download the documents by following these steps:`,
    "",
    "Login to Rippling.",
    "Go to Tools.",
    "Click on Documents.",
    "Click Export on the top left.",
    "Under the export tab, you can bulk download the following documents:",
    "",
    "All employee pay stubs",
    "Most employee documents",
    "Tax documents",
    "ACA reports",
    "Payroll reports",
    "",
    `You will have access to Rippling until the account closure date, which is ${blank(formatLong(els.logoChurn.value), MISSING.logoChurn)}. After that, your account will be closed. You can still access Rippling for 30 days after the account closure to download any documents (only), and you will have access to download documents until ${blank(formatLong(els.docAccess.value), MISSING.docAccess)}.`,
    "",
  ];
  if (els.includeCobra.checked) lines.push(cobraBlock(), "");
  lines.push(
    `Data from reports can be downloaded only until the account closure date of ${blank(formatLong(els.logoChurn.value), MISSING.logoChurn)} from the Reports tab under Data > Reports. Make sure to create and download any necessary reports before this date as Reports access will be disabled on the termination date.`,
    "",
    helpSentence(),
    "",
    "Should you have any questions or need further assistance, please don't hesitate to contact me.",
    ...signoffLines(),
  );
  return lines.join("\n");
}

function buildChurn() {
  const dba = blank(els.companyDba.value, MISSING.companyDba);
  const billing = blank(formatLong(els.billingEnd.value), MISSING.billingEnd);
  const lines = [
    `Hello ${blank(els.firstName.value, MISSING.firstName)},`,
    "",
    "I confirm that your Rippling services account closure is now finalized. No further action is required on your part.",
    "",
    "Follow these steps to verify:",
    "",
    "From the sidebar, select Company Settings > Company Settings.",
    "",
    "Select the Billing tab > Subscriptions sub-tab.",
    "",
    "Select Offboarding subscriptions from the dropdown > View offboarding details.",
    "",
    "Please find the important details regarding your account closure below:",
    "",
    `Billing End Date: ${billing}. You will not incur any subscription charges after this date, and access to all Rippling subscriptions will terminate on this date.`,
    "",
    `Offboarding Email: We have dispatched an email titled "[IMPORTANT] ${dba} - Information About Offboarding." This email contains critical product-specific shutoff dates, data export deadlines, and other essential offboarding-related information.`,
    "",
    "Important - US Filing Preferences: Your filing preferences are set to:",
    "",
    `Last quarterly tax filing: ${blank(els.churnQuarter.value, MISSING.churnQuarter)}`,
    "",
    `Last annual tax filing (inc. W-2s): ${blank(els.churnAnnual.value, MISSING.churnAnnual)}`,
    "",
    "Please contact us if you want us to make any changes to these filing preferences.",
    "",
  ];
  if (els.includeProducts.checked) {
    const products = state.products.length ? state.products.join("\n") : `[${MISSING.products}]`;
    lines.push(
      "Important - You will need to download all critical data from these products before the account termination:",
      "",
      products,
      "",
    );
  }
  if (els.includeRefund.checked) {
    lines.push(
      `Refund Information: A refund for the ${refundScope()} has been approved and will be credited to your account within 3-5 business days after your ${billing}.`,
      "",
    );
  }
  lines.push(
    `If you have any questions, concerns, or require assistance with cancelling this account closure, please reach out to us before ${blank(formatLong(els.cancelBy.value), MISSING.cancelBy)}. We cannot accept account closure cancellation requests beyond this timeframe, as the process will already be triggered in our backend systems.`,
    ...signoffLines(),
  );
  return lines.join("\n");
}

function currentEmail() {
  return state.tab === "peo" ? buildPeo() : buildChurn();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlight(plain) {
  let html = escapeHtml(plain);
  MISSING_TOKENS.forEach((token) => {
    html = html.split(escapeHtml(token)).join(`<mark>${escapeHtml(token)}</mark>`);
  });
  html = html.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const clean = url.replace(/[),.]+$/, "");
    const trailing = url.slice(clean.length);
    return `<a href="${clean}">${clean}</a>${trailing}`;
  });
  return html;
}

function renderProducts() {
  els.productList.innerHTML = "";
  state.products.forEach((name, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product";
    button.textContent = `${name} ×`;
    button.setAttribute("aria-label", `Remove ${name}`);
    button.addEventListener("click", () => {
      state.products.splice(index, 1);
      render();
    });
    els.productList.appendChild(button);
  });
  els.productTools.hidden = !els.includeProducts.checked;
  els.refundOptions.hidden = !els.includeRefund.checked;
}

function render() {
  syncDerivedDates();
  syncBenefits();
  syncFirstName();
  syncSubject();
  renderProducts();

  const email = currentEmail();
  const blanks = countBlanks(`${els.subject.value}\n${email}`);
  els.letter.innerHTML = highlight(email);
  els.previewKicker.textContent = state.tab === "peo" ? "PEO termination" : "Account closure";
  els.readiness.textContent = blanks === 0 ? "Ready to copy" : `${blanks} blank${blanks === 1 ? "" : "s"} still in this email`;
  els.readiness.classList.toggle("is-ready", blanks === 0);
  els.readiness.classList.toggle("has-blanks", blanks > 0);
  document.title = els.companyDba.value.trim()
    ? `Churn macros — ${els.companyDba.value.trim()}`
    : "Churn email macros";
  save();
}

function setTab(tab) {
  state.tab = tab;
  $("panel-peo").hidden = tab !== "peo";
  $("panel-churn").hidden = tab !== "churn";
  $("tab-peo").classList.toggle("is-active", tab === "peo");
  $("tab-churn").classList.toggle("is-active", tab === "churn");
  $("tab-peo").setAttribute("aria-selected", String(tab === "peo"));
  $("tab-churn").setAttribute("aria-selected", String(tab === "churn"));
  state.subjectTouched[tab] = state.subjectTouched[tab] || false;
  render();
}

function addProduct(name) {
  const clean = name.trim();
  if (!clean) return;
  if (!state.products.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    state.products.push(clean);
  }
  els.productInput.value = "";
  render();
}

function snapshot() {
  return {
    tab: state.tab,
    firstNameTouched: state.firstNameTouched,
    subjectTouched: state.subjectTouched,
    products: state.products,
    cobraTouched: Boolean(state.cobraTouched),
    fields: {
      customerName: els.customerName.value,
      firstName: els.firstName.value,
      companyDba: els.companyDba.value,
      agentName: els.agentName.value,
      signoffStyle: els.signoffStyle.value,
      peoTermination: els.peoTermination.value,
      accountClosure: els.accountClosure.value,
      finalPayroll: els.finalPayroll.value,
      finalPayRun: els.finalPayRun.value,
      finalPayRunSame: els.finalPayRunSame.checked,
      logoChurn: els.logoChurn.value,
      logoSame: els.logoSame.checked,
      docAccess: els.docAccess.value,
      docAccessAuto: els.docAccessAuto.checked,
      peoQuarter: els.peoQuarter.value,
      peoAnnual: els.peoAnnual.value,
      benefits: selectedBenefits(),
      includeCobra: els.includeCobra.checked,
      cobraUrl: els.cobraUrl.value,
      helpUrl: els.helpUrl.value,
      billingEnd: els.billingEnd.value,
      cancelBy: els.cancelBy.value,
      cancelByAuto: els.cancelByAuto.checked,
      churnQuarter: els.churnQuarter.value,
      churnAnnual: els.churnAnnual.value,
      includeProducts: els.includeProducts.checked,
      includeRefund: els.includeRefund.checked,
      refundScope: refundScope(),
      subject: els.subject.value,
      subjects: state.subjects || {},
    },
  };
}

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = snapshot();
    data.subjects = state.subjects || {};
    data.subjects[state.tab] = els.subject.value;
    state.subjects = data.subjects;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, 120);
}

function applySnapshot(data) {
  const fields = data.fields || {};
  els.customerName.value = fields.customerName || "";
  els.firstName.value = fields.firstName || "";
  els.companyDba.value = fields.companyDba || "";
  els.agentName.value = fields.agentName || "";
  els.signoffStyle.value = fields.signoffStyle || "none";
  els.peoTermination.value = fields.peoTermination || "";
  els.accountClosure.value = fields.accountClosure || "";
  els.finalPayroll.value = fields.finalPayroll || "";
  els.finalPayRun.value = fields.finalPayRun || "";
  els.finalPayRunSame.checked = fields.finalPayRunSame !== false;
  els.logoChurn.value = fields.logoChurn || "";
  els.logoSame.checked = fields.logoSame !== false;
  els.docAccess.value = fields.docAccess || "";
  els.docAccessAuto.checked = fields.docAccessAuto !== false;
  els.peoQuarter.value = fields.peoQuarter || "";
  els.peoAnnual.value = fields.peoAnnual || "";
  els.cobraUrl.value = fields.cobraUrl || "";
  els.helpUrl.value = fields.helpUrl || "";
  els.billingEnd.value = fields.billingEnd || "";
  els.cancelBy.value = fields.cancelBy || "";
  els.cancelByAuto.checked = fields.cancelByAuto !== false;
  els.churnQuarter.value = fields.churnQuarter || "";
  els.churnAnnual.value = fields.churnAnnual || "";
  els.includeProducts.checked = fields.includeProducts !== false;
  els.includeRefund.checked = Boolean(fields.includeRefund);
  document.querySelectorAll('input[name="benefits"]').forEach((input) => {
    input.checked = input.value === fields.benefits;
  });
  document.querySelectorAll('input[name="refund-scope"]').forEach((input) => {
    input.checked = input.value === (fields.refundScope || "rest of the contract period");
  });
  state.products = Array.isArray(data.products) ? data.products.slice() : [];
  state.firstNameTouched = Boolean(data.firstNameTouched);
  state.subjectTouched = data.subjectTouched || { peo: false, churn: false };
  state.cobraTouched = Boolean(data.cobraTouched);
  state.subjects = fields.subjects || data.subjects || {};
  state.tab = data.tab === "churn" ? "churn" : "peo";
  syncBenefits();
  if (fields.includeCobra != null && selectedBenefits() === "not-offering") {
    els.includeCobra.checked = Boolean(fields.includeCobra);
  }
  if (state.subjectTouched[state.tab] && state.subjects[state.tab]) {
    els.subject.value = state.subjects[state.tab];
  }
}

function loadExample() {
  applySnapshot({
    tab: state.tab,
    firstNameTouched: false,
    subjectTouched: { peo: false, churn: false },
    cobraTouched: false,
    products: ["Spend", "Review Cycles"],
    fields: {
      customerName: "Jordan Lee",
      companyDba: "Northwind Labs",
      agentName: "Alex Chen",
      signoffStyle: "regards",
      peoTermination: "2026-03-31",
      accountClosure: "2026-04-15",
      finalPayroll: "2026-03-27",
      finalPayRunSame: true,
      logoSame: true,
      docAccessAuto: true,
      peoQuarter: "Q1 2026",
      peoAnnual: "2025",
      benefits: "not-offering",
      includeCobra: true,
      billingEnd: "2026-04-15",
      cancelByAuto: true,
      churnQuarter: "Q1 2026",
      churnAnnual: "2025",
      includeProducts: true,
      includeRefund: true,
      refundScope: "rest of the contract period",
    },
  });
  render();
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
  state.products = [];
  state.firstNameTouched = false;
  state.subjectTouched = { peo: false, churn: false };
  state.cobraTouched = false;
  state.subjects = {};
  document.getElementById("macro-form").reset();
  els.finalPayRunSame.checked = true;
  els.logoSame.checked = true;
  els.docAccessAuto.checked = true;
  els.cancelByAuto.checked = true;
  els.includeProducts.checked = true;
  document.querySelector('input[name="refund-scope"][value="rest of the contract period"]').checked = true;
  render();
}

function showToast(message) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  const blanks = countBlanks(value);
  showToast(blanks ? `${label} copied with ${blanks} blank${blanks === 1 ? "" : "s"}` : `${label} copied`);
}

function downloadEmail() {
  const email = currentEmail();
  const blob = new Blob([`Subject: ${els.subject.value}\n\n${email}\n`], { type: "text/plain" });
  const link = document.createElement("a");
  const slug = (els.companyDba.value || "customer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.tab}-churn-${slug || "customer"}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function filingChips() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const nextQuarter = quarter === 4 ? `Q1 ${year + 1}` : `Q${quarter + 1} ${year}`;
  const values = [`Q${quarter} ${year}`, nextQuarter, String(year - 1), String(year), String(year + 1)];
  document.querySelectorAll("[data-chips-for]").forEach((box) => {
    const target = $(box.dataset.chipsFor);
    values.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = value;
      button.addEventListener("click", () => {
        target.value = value;
        render();
      });
      box.appendChild(button);
    });
  });
  const suggestions = $("product-suggestions");
  PRODUCT_SUGGESTIONS.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = name;
    button.addEventListener("click", () => addProduct(name));
    suggestions.appendChild(button);
  });
}

function bind() {
  document.getElementById("macro-form").addEventListener("submit", (event) => event.preventDefault());
  document.getElementById("macro-form").addEventListener("input", (event) => {
    if (event.target === els.firstName) state.firstNameTouched = true;
    if (event.target === els.subject) {
      state.subjectTouched[state.tab] = true;
      state.subjects = state.subjects || {};
      state.subjects[state.tab] = els.subject.value;
    }
    if (event.target === els.includeCobra) state.cobraTouched = true;
    if (event.target.name === "benefits") state.cobraTouched = false;
    render();
  });
  $("tab-peo").addEventListener("click", () => {
    state.subjects = state.subjects || {};
    state.subjects[state.tab] = els.subject.value;
    setTab("peo");
    if (state.subjectTouched.peo && state.subjects.peo) els.subject.value = state.subjects.peo;
  });
  $("tab-churn").addEventListener("click", () => {
    state.subjects = state.subjects || {};
    state.subjects[state.tab] = els.subject.value;
    setTab("churn");
    if (state.subjectTouched.churn && state.subjects.churn) els.subject.value = state.subjects.churn;
  });
  $("add-product").addEventListener("click", () => addProduct(els.productInput.value));
  els.productInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addProduct(els.productInput.value);
    }
  });
  $("copy-email").addEventListener("click", () => copyText(currentEmail(), "Email"));
  $("copy-subject").addEventListener("click", () => copyText(els.subject.value, "Subject"));
  $("download-email").addEventListener("click", downloadEmail);
  $("reset-subject").addEventListener("click", () => {
    state.subjectTouched[state.tab] = false;
    render();
  });
  $("load-example").addEventListener("click", () => {
    const hasContent = els.customerName.value || els.companyDba.value || state.products.length;
    if (hasContent && !confirm("Replace the current details with the example?")) return;
    loadExample();
  });
  $("clear-all").addEventListener("click", () => {
    if (!confirm("Clear every field?")) return;
    clearAll();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      copyText(currentEmail(), "Email");
    }
  });
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    applySnapshot(JSON.parse(raw));
    return true;
  } catch {
    return false;
  }
}

function runSelfTest() {
  const failures = [];
  const check = (condition, message) => {
    if (!condition) failures.push(message);
  };
  check(addDays("2026-04-15", 30) === "2026-05-15", "April 15 plus 30 days");
  check(addDays("2026-04-15", -2) === "2026-04-13", "April 15 minus 2 days");
  check(addDays("2026-03-01", -2) === "2026-02-27", "March 1 minus 2 days");
  check(addDays("2026-01-31", 30) === "2026-03-02", "January 31 plus 30 days");
  check(formatLong("2026-04-15") === "April 15, 2026", "long date format");
  check(addDays("", 30) === "", "empty date stays empty");

  clearAll();
  loadExample();
  const peo = buildPeo();
  check(peo.includes("Hi Jordan Lee,"), "customer greeting");
  check(peo.includes("PEO termination date: March 31, 2026"), "termination date");
  check(peo.includes("Account closure date: April 15, 2026"), "closure date");
  check(peo.includes("Final payroll with Rippling: March 27, 2026"), "final payroll");
  check(peo.includes("Last quarterly filing by Rippling: Q1 2026"), "peo quarter");
  check(peo.includes("Last annual filing by Rippling: 2025"), "peo annual");
  check(peo.includes("Northwind Labs is not offering new healthcare benefits"), "not offering");
  check(peo.includes("Rippling will provide PEO COBRA coverage"), "will provide cobra");
  check(peo.includes('"[IMPORTANT] Northwind Labs - Information About Offboarding"'), "offboarding title");
  check(peo.includes("on March 27, 2026."), "final pay run date in sentence");
  check(peo.includes("which is April 15, 2026."), "logo churn");
  check(peo.includes("until May 15, 2026."), "plus 30");
  check(peo.includes("One-time $5,000 fee per company."), "cobra setup fee");
  check(peo.includes("Monthly $1,000 fee per employee"), "cobra monthly fee");
  check(peo.includes("section 11.4 \"Replacement Coverage.\""), "terms citation");
  check(peo.includes("Login to Rippling."), "export steps");
  check(peo.includes("Data > Reports"), "reports path");
  check(peo.includes("account closure request?"), "help question without a link");
  check(peo.includes("Best regards,\nAlex Chen"), "sign-off");
  els.helpUrl.value = "https://example.com/export";
  els.cobraUrl.value = "https://example.com/cobra";
  const withLinks = buildPeo();
  check(withLinks.includes("request: https://example.com/export"), "help url");
  check(withLinks.includes("Rippling PEO: https://example.com/cobra."), "cobra url");
  els.helpUrl.value = "";
  els.cobraUrl.value = "";
  check(countBlanks(peo) === 0, `peo blanks: ${peo.match(/\[[^\]\n]+\]/g)}`);

  const peoNode = document.createElement("div");
  peoNode.innerHTML = highlight(peo);
  check(peoNode.textContent === peo, "peo preview matches copy text");

  const churn = buildChurn();
  check(churn.startsWith("Hello Jordan,"), "churn greeting");
  check(churn.includes("Billing End Date: April 15, 2026."), "billing end");
  check(churn.includes("Last quarterly tax filing: Q1 2026"), "churn quarter");
  check(churn.includes("Last annual tax filing (inc. W-2s): 2025"), "churn annual");
  check(churn.includes("Spend\nReview Cycles"), "product list");
  check(churn.includes("refund for the rest of the contract period"), "refund scope");
  check(churn.includes("before April 13, 2026."), "cancel deadline");
  check(churn.includes("Company Settings > Company Settings."), "verify steps");
  check(countBlanks(churn) === 0, `churn blanks: ${churn.match(/\[[^\]\n]+\]/g)}`);

  document.querySelector('input[name="benefits"][value="offering"]').checked = true;
  state.cobraTouched = false;
  syncBenefits();
  const offering = buildPeo();
  check(offering.includes("Northwind Labs is offering new healthcare benefits"), "offering phrase");
  check(offering.includes("Rippling will not provide PEO COBRA coverage"), "will not provide");
  check(!offering.includes("$5,000"), "fee section omitted when offering benefits");
  check(!els.includeCobra.checked && els.includeCobra.disabled, "cobra checkbox locked off");

  els.includeProducts.checked = false;
  els.includeRefund.checked = false;
  const slim = buildChurn();
  check(!slim.includes("Spend"), "product section omitted");
  check(!slim.includes("Refund Information"), "refund section omitted");

  const out = $("selftest");
  out.hidden = false;
  out.textContent = failures.length ? `FAIL\n${failures.join("\n")}` : "PASS";
}

function init() {
  filingChips();
  bind();
  const params = new URLSearchParams(location.search);
  if (params.has("selftest")) {
    runSelfTest();
    return;
  }
  if (params.has("sample")) loadExample();
  else restore();
  if (params.get("tab") === "churn" || params.get("tab") === "peo") setTab(params.get("tab"));
  else setTab(state.tab || "peo");
}

init();
