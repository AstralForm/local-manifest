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

const LINKS = {
  terms: "https://app.rippling.com/legal/peo",
  exportTab: "https://app.rippling.com/documents/export-dashboard",
  cobraFees: "https://help.rippling.com/article?articleId=360060242253",
  exportHelp: "https://help.rippling.com/article?articleId=635875398636",
};

function show(value) {
  const safe = escapeHtml(value);
  return isBlank(value) ? `<mark>${safe}</mark>` : safe;
}

function strong(html) {
  return `<strong>${html}</strong>`;
}

function link(href, label, withBold) {
  const inner = withBold ? strong(escapeHtml(label)) : escapeHtml(label);
  return `<a href="${escapeHtml(href)}" style="color:#1155cc;text-decoration:underline">${inner}</a>`;
}

function linkedText(label, href) {
  return `${label} (${href})`;
}

function listHtml(tag, items, nested) {
  const margin = nested ? "4px 0 0" : "0 0 12px";
  const marker = tag === "ul" ? ";list-style-type:disc" : "";
  return `<${tag} style="margin:${margin};padding-left:22px${marker}">${items.map((item) => `<li style="margin:2px 0">${item.html}</li>`).join("")}</${tag}>`;
}

function listText(tag, items) {
  return items.map((item, index) => {
    const prefix = tag === "ol" ? `${index + 1}. ` : "- ";
    return item.text.split("\n").map((line, lineIndex) => (lineIndex === 0 ? `${prefix}${line}` : `  ${line}`)).join("\n");
  }).join("\n");
}

function para(html, text) {
  return { html: `<p style="margin:0 0 12px">${html}</p>`, text };
}

function bullets(items) {
  return { html: listHtml("ul", items, false), text: listText("ul", items) };
}

function numbers(items) {
  return { html: listHtml("ol", items, false), text: listText("ol", items) };
}

function joinEmail(parts) {
  const kept = parts.filter(Boolean);
  return {
    html: kept.map((part) => part.html).join(""),
    text: kept.map((part) => part.text).join("\n\n"),
  };
}

function signoffPart() {
  const lines = signoffLines().filter((line) => line !== "");
  if (!lines.length) return null;
  return para(lines.map((line) => escapeHtml(line)).join("<br>"), lines.join("\n"));
}

function buildPeoEmail() {
  const benefits = selectedBenefits();
  const offeringPhrase = benefits === "offering" ? "offering" : benefits === "not-offering" ? "not offering" : `[${MISSING.benefits}]`;
  const cobraPhrase = benefits === "offering" ? "will not" : benefits === "not-offering" ? "will" : `[${MISSING.cobraVerb}]`;
  const dba = blank(els.companyDba.value, MISSING.companyDba);
  const customer = blank(els.customerName.value, MISSING.customerName);
  const termination = blank(formatLong(els.peoTermination.value), MISSING.peoTermination);
  const closure = blank(formatLong(els.accountClosure.value), MISSING.accountClosure);
  const payroll = blank(formatLong(els.finalPayroll.value), MISSING.finalPayroll);
  const quarter = blank(els.peoQuarter.value, MISSING.lastQuarterly);
  const annual = blank(els.peoAnnual.value, MISSING.lastAnnual);
  const payRun = blank(formatLong(els.finalPayRun.value), MISSING.finalPayRun);
  const logo = blank(formatLong(els.logoChurn.value), MISSING.logoChurn);
  const docAccess = blank(formatLong(els.docAccess.value), MISSING.docAccess);
  const title = `"[IMPORTANT] ${dba} - Information About Offboarding"`;
  const helpLabel = "Helpful article for your reference on how to view and export your company's data and documents stored in Rippling after an account closure request?";

  const parts = [
    para(`Hi ${show(customer)},`, `Hi ${customer},`),
    para(
      `I want to reach out to share that your Rippling PEO for the company ${show(dba)} will be terminated with these details:`,
      `I want to reach out to share that your Rippling PEO for the company ${dba} will be terminated with these details:`,
    ),
    numbers([
      { html: `PEO termination date: ${show(termination)}`, text: `PEO termination date: ${termination}` },
      { html: `Account closure date: ${show(closure)}`, text: `Account closure date: ${closure}` },
      { html: `Final payroll with Rippling: ${show(payroll)}`, text: `Final payroll with Rippling: ${payroll}` },
      { html: `Last quarterly filing by Rippling: ${show(quarter)}`, text: `Last quarterly filing by Rippling: ${quarter}` },
      { html: `Last annual filing by Rippling: ${show(annual)}`, text: `Last annual filing by Rippling: ${annual}` },
      {
        html: `${show(dba)} is ${strong(show(offeringPhrase))} new healthcare benefits to their employees following their termination from Rippling PEO. Consequently, Rippling ${strong(show(cobraPhrase))} provide PEO COBRA coverage to their worksite employees – both active &amp; terminated, as outlined in ${link(LINKS.terms, "Rippling PEO Terms of Service", true)}, section 11.4 "Replacement Coverage."`,
        text: `${dba} is ${offeringPhrase} new healthcare benefits to their employees following their termination from Rippling PEO. Consequently, Rippling ${cobraPhrase} provide PEO COBRA coverage to their worksite employees – both active & terminated, as outlined in ${linkedText("Rippling PEO Terms of Service", LINKS.terms)}, section 11.4 "Replacement Coverage."`,
      },
    ]),
    para(
      `You will receive an email from Rippling titled ${strong(show(title))} with all the offboarding information on ${strong(show(payRun))}. An export is enabled in Rippling then, allowing you to download the documents by following these steps:`,
      `You will receive an email from Rippling titled ${title} with all the offboarding information on ${payRun}. An export is enabled in Rippling then, allowing you to download the documents by following these steps:`,
    ),
    bullets([
      { html: "Login to Rippling.", text: "Login to Rippling." },
      { html: "Go to Tools.", text: "Go to Tools." },
      { html: "Click on Documents.", text: "Click on Documents." },
      { html: `Click ${strong("Export")} on the top left.`, text: "Click Export on the top left." },
    ]),
    para(
      `Under the ${link(LINKS.exportTab, "export tab", true)}, you can bulk download the following documents:`,
      `Under the ${linkedText("export tab", LINKS.exportTab)}, you can bulk download the following documents:`,
    ),
    bullets([
      "All employee pay stubs",
      "Most employee documents",
      "Tax documents",
      "ACA reports",
      "Payroll reports",
    ].map((item) => ({ html: item, text: item }))),
    para(
      `You will have access to Rippling until the account closure date, which is ${strong(show(logo))}. After that, your account will be closed. You can still access Rippling for 30 days after the account closure to download any documents (only), and you will have access to download documents until ${strong(show(docAccess))}.`,
      `You will have access to Rippling until the account closure date, which is ${logo}. After that, your account will be closed. You can still access Rippling for 30 days after the account closure to download any documents (only), and you will have access to download documents until ${docAccess}.`,
    ),
  ];

  if (els.includeCobra.checked) {
    parts.push(
      para(
        `If you are not offering healthcare benefits to your employees following termination from Rippling PEO, and COBRA participants remain on Rippling PEO-sponsored COBRA coverage after Rippling PEO contract termination, Rippling will charge you the following PEO COBRA Orphan Access fees per ${link(LINKS.terms, "Rippling PEO Terms of Service", true)}, section 11.4 "Replacement Coverage":`,
        `If you are not offering healthcare benefits to your employees following termination from Rippling PEO, and COBRA participants remain on Rippling PEO-sponsored COBRA coverage after Rippling PEO contract termination, Rippling will charge you the following PEO COBRA Orphan Access fees per ${linkedText("Rippling PEO Terms of Service", LINKS.terms)}, section 11.4 "Replacement Coverage":`,
      ),
      bullets([
        { html: "One-time $5,000 fee per company.", text: "One-time $5,000 fee per company." },
        {
          html: "Monthly $1,000 fee per employee and/or dependent COBRA participant charged on the first day of each month, for each employee and/or dependent enrolled in Rippling PEO-sponsored COBRA coverage following the termination of your Rippling PEO contract.",
          text: "Monthly $1,000 fee per employee and/or dependent COBRA participant charged on the first day of each month, for each employee and/or dependent enrolled in Rippling PEO-sponsored COBRA coverage following the termination of your Rippling PEO contract.",
        },
        {
          html: `COBRA administration fees will still apply in the case that you terminate your Rippling PEO contract due to business closure. Please see this Help Center article for additional details: ${link(LINKS.cobraFees, "COBRA administrative fees for companies that leave Rippling PEO")}.`,
          text: `COBRA administration fees will still apply in the case that you terminate your Rippling PEO contract due to business closure. Please see this Help Center article for additional details: ${linkedText("COBRA administrative fees for companies that leave Rippling PEO", LINKS.cobraFees)}.`,
        },
      ]),
    );
  }

  parts.push(
    para(
      `Data from reports can be downloaded only until the account closure date of ${strong(show(logo))} from the Reports tab under ${strong("Data &gt; Reports")}. Make sure to create and download any necessary reports before this date as ${strong("Reports access will be disabled")} on the termination date.`,
      `Data from reports can be downloaded only until the account closure date of ${logo} from the Reports tab under Data > Reports. Make sure to create and download any necessary reports before this date as Reports access will be disabled on the termination date.`,
    ),
    para(link(LINKS.exportHelp, helpLabel), linkedText(helpLabel, LINKS.exportHelp)),
    para(
      "Should you have any questions or need further assistance, please don't hesitate to contact me.",
      "Should you have any questions or need further assistance, please don't hesitate to contact me.",
    ),
    signoffPart(),
  );
  return joinEmail(parts);
}

function buildChurnEmail() {
  const dba = blank(els.companyDba.value, MISSING.companyDba);
  const billing = blank(formatLong(els.billingEnd.value), MISSING.billingEnd);
  const firstName = blank(els.firstName.value, MISSING.firstName);
  const quarter = blank(els.churnQuarter.value, MISSING.churnQuarter);
  const annual = blank(els.churnAnnual.value, MISSING.churnAnnual);
  const cancelBy = blank(formatLong(els.cancelBy.value), MISSING.cancelBy);
  const title = `"[IMPORTANT] ${dba} - Information About Offboarding."`;
  const scope = refundScope();
  const filingItems = [
    { html: `Last quarterly tax filing: ${show(quarter)}`, text: `Last quarterly tax filing: ${quarter}` },
    { html: `Last annual tax filing (inc. W-2s): ${show(annual)}`, text: `Last annual tax filing (inc. W-2s): ${annual}` },
    {
      html: "Please contact us if you want us to make any changes to these filing preferences.",
      text: "Please contact us if you want us to make any changes to these filing preferences.",
    },
  ];
  const detailItems = [
    {
      html: `${strong("Billing End Date:")} ${show(billing)}. You will not incur any subscription charges after this date, and access to all Rippling subscriptions will terminate on this date.`,
      text: `Billing End Date: ${billing}. You will not incur any subscription charges after this date, and access to all Rippling subscriptions will terminate on this date.`,
    },
    {
      html: `${strong("Offboarding Email:")} We have dispatched an email titled ${strong(show(title))} This email contains critical product-specific shutoff dates, data export deadlines, and other essential offboarding-related information.`,
      text: `Offboarding Email: We have dispatched an email titled ${title} This email contains critical product-specific shutoff dates, data export deadlines, and other essential offboarding-related information.`,
    },
    {
      html: `${strong("Important - US Filing Preferences:")} Your filing preferences are set to:${listHtml("ul", filingItems, true)}`,
      text: `Important - US Filing Preferences: Your filing preferences are set to:\n${listText("ul", filingItems)}`,
    },
  ];

  if (els.includeProducts.checked) {
    const products = state.products.length
      ? state.products.map((name) => ({ html: escapeHtml(name), text: name }))
      : [{ html: show(`[${MISSING.products}]`), text: `[${MISSING.products}]` }];
    detailItems.push({
      html: `${strong("Important - You will need to download all critical data from these products before the account termination:")}${listHtml("ul", products, true)}`,
      text: `Important - You will need to download all critical data from these products before the account termination:\n${listText("ul", products)}`,
    });
  }

  if (els.includeRefund.checked) {
    detailItems.push({
      html: `${strong("Refund Information:")} A refund for the ${strong(escapeHtml(scope))} has been approved and will be credited to your account within 3-5 business days after your ${strong(show(billing))}.`,
      text: `Refund Information: A refund for the ${scope} has been approved and will be credited to your account within 3-5 business days after your ${billing}.`,
    });
  }

  return joinEmail([
    para(`Hello ${show(firstName)},`, `Hello ${firstName},`),
    para(
      "I confirm that your Rippling services account closure is now finalized. No further action is required on your part.",
      "I confirm that your Rippling services account closure is now finalized. No further action is required on your part.",
    ),
    para("Follow these steps to verify:", "Follow these steps to verify:"),
    bullets([
      {
        html: `From the sidebar, select ${strong("Company Settings &gt; Company Settings")}.`,
        text: "From the sidebar, select Company Settings > Company Settings.",
      },
      {
        html: `Select the ${strong("Billing tab &gt; Subscriptions sub-tab")}.`,
        text: "Select the Billing tab > Subscriptions sub-tab.",
      },
      {
        html: `Select ${strong("Offboarding subscriptions from the dropdown &gt; View offboarding details")}.`,
        text: "Select Offboarding subscriptions from the dropdown > View offboarding details.",
      },
    ]),
    para(
      "Please find the important details regarding your account closure below:",
      "Please find the important details regarding your account closure below:",
    ),
    bullets(detailItems),
    para(
      `If you have any questions, concerns, or require assistance with cancelling this account closure, please reach out to us before ${strong(show(cancelBy))}. We cannot accept account closure cancellation requests beyond this timeframe, as the process will already be triggered in our backend systems.`,
      `If you have any questions, concerns, or require assistance with cancelling this account closure, please reach out to us before ${cancelBy}. We cannot accept account closure cancellation requests beyond this timeframe, as the process will already be triggered in our backend systems.`,
    ),
    signoffPart(),
  ]);
}

function buildPeo() {
  return buildPeoEmail().text;
}

function buildChurn() {
  return buildChurnEmail().text;
}

function currentEmail() {
  return state.tab === "peo" ? buildPeoEmail() : buildChurnEmail();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  const blanks = countBlanks(`${els.subject.value}\n${email.text}`);
  els.letter.innerHTML = email.html;
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

async function copyEmail() {
  const email = currentEmail();
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#222">${email.html}</div>`;
  const blanks = countBlanks(email.text);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([email.text], { type: "text/plain" }),
      }),
    ]);
    showToast(blanks ? `Email copied with ${blanks} blank${blanks === 1 ? "" : "s"}` : "Email copied");
  } catch {
    copyText(email.text, "Email");
  }
}

function downloadEmail() {
  const email = currentEmail().text;
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
  $("copy-email").addEventListener("click", () => copyEmail());
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
      copyEmail();
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
  check(peo.includes("1. PEO termination date: March 31, 2026"), "termination date");
  check(peo.includes("2. Account closure date: April 15, 2026"), "closure date");
  check(peo.includes("3. Final payroll with Rippling: March 27, 2026"), "final payroll");
  check(peo.includes("4. Last quarterly filing by Rippling: Q1 2026"), "peo quarter");
  check(peo.includes("5. Last annual filing by Rippling: 2025"), "peo annual");
  check(peo.includes("6. Northwind Labs is not offering"), "numbered healthcare item");
  check(peo.includes("- Login to Rippling.\n- Go to Tools.\n- Click on Documents.\n- Click Export on the top left."), "export steps");
  check(peo.includes("- All employee pay stubs\n- Most employee documents\n- Tax documents\n- ACA reports\n- Payroll reports"), "document bullets");
  check(peo.includes("- One-time $5,000 fee per company."), "cobra bullet");
  check(peo.includes(LINKS.terms), "terms url");
  check(peo.includes(LINKS.exportTab), "export tab url");
  check(peo.includes(LINKS.cobraFees), "cobra article url");
  check(peo.includes(LINKS.exportHelp), "export help url");
  check(peo.includes("Northwind Labs is not offering new healthcare benefits"), "not offering");
  check(peo.includes("Rippling will provide PEO COBRA coverage"), "will provide cobra");
  check(peo.includes('"[IMPORTANT] Northwind Labs - Information About Offboarding"'), "offboarding title");
  check(peo.includes("on March 27, 2026."), "final pay run date in sentence");
  check(peo.includes("which is April 15, 2026."), "logo churn");
  check(peo.includes("until May 15, 2026."), "plus 30");
  check(peo.includes("One-time $5,000 fee per company."), "cobra setup fee");
  check(peo.includes("Monthly $1,000 fee per employee"), "cobra monthly fee");
  check(peo.includes("section 11.4 \"Replacement Coverage.\""), "terms citation");
  check(peo.includes("Data > Reports"), "reports path");
  check(peo.includes("account closure request?"), "help question");
  check(peo.includes("Best regards,\nAlex Chen"), "sign-off");
  check(!peo.includes("http") || peo.includes(LINKS.terms), "fixed links only");
  check(countBlanks(peo) === 0, `peo blanks: ${peo.match(/\[[^\]\n]+\]/g)}`);

  const peoHtml = buildPeoEmail().html;
  check(peoHtml.includes("<ol"), "numbered list");
  check((peoHtml.match(/<li /g) || []).length >= 6, "peo list items");
  check((peoHtml.match(/app\.rippling\.com\/legal\/peo/g) || []).length === 2, "terms linked twice");
  check(peoHtml.includes(`href="${LINKS.exportTab}"`), "export tab linked");
  check(peoHtml.includes(`href="${LINKS.cobraFees}"`), "cobra article linked");
  check(peoHtml.includes(`href="${LINKS.exportHelp}"`), "help article linked");
  check(!peoHtml.includes("cobra-url") && !peoHtml.includes("example.com"), "no custom link fields");

  const churn = buildChurn();
  check(churn.startsWith("Hello Jordan,"), "churn greeting");
  check(churn.includes("Billing End Date: April 15, 2026."), "billing end");
  check(churn.includes("Last quarterly tax filing: Q1 2026"), "churn quarter");
  check(churn.includes("Last annual tax filing (inc. W-2s): 2025"), "churn annual");
  check(churn.includes("- From the sidebar, select Company Settings > Company Settings.\n- Select the Billing tab > Subscriptions sub-tab.\n- Select Offboarding subscriptions from the dropdown > View offboarding details."), "verify bullets");
  check(churn.includes("  - Last quarterly tax filing: Q1 2026\n  - Last annual tax filing (inc. W-2s): 2025\n  - Please contact us"), "nested filing bullets");
  check(churn.includes("  - Spend\n  - Review Cycles"), "nested product bullets");
  check(churn.includes("refund for the rest of the contract period"), "refund scope");
  check(churn.includes("before April 13, 2026."), "cancel deadline");
  check(churn.includes("Company Settings > Company Settings."), "verify steps");
  check(countBlanks(churn) === 0, `churn blanks: ${churn.match(/\[[^\]\n]+\]/g)}`);

  document.querySelector('input[name="benefits"][value="offering"]').checked = true;
  state.cobraTouched = false;
  syncBenefits();
  const offeringEmail = buildPeoEmail();
  const offering = offeringEmail.text;
  check(offering.includes("Northwind Labs is offering new healthcare benefits"), "offering phrase");
  check(offering.includes("Rippling will not provide PEO COBRA coverage"), "will not provide");
  check(!offering.includes("$5,000"), "fee section omitted when offering benefits");
  check(!offeringEmail.html.includes(LINKS.cobraFees), "cobra link omitted with the fee section");
  check(offeringEmail.html.includes(LINKS.terms), "terms link remains");
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
