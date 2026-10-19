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
  amName: "AM name",
  amEmail: "AM email",
  meetingLink: "Meeting link",
  resellerSubscription: "Reseller subscription",
  entityName: "Entity name",
  country: "Country",
  fundingSource: "New currency or country",
  originalType: "Original funding type",
  newType: "New funding type",
  domain: "Domain",
  googleAccount: "Google account",
  googleEmail: "Google email",
  scheduledDate: "Scheduled cancellation date",
  proactiveEnd: "Termination date",
  replyBy: "Reply-by date",
};

const MACROS = [
  { id: "peo", group: "Logo churn", label: "PEO Logo Churn" },
  { id: "churn", group: "Logo churn", label: "Logo Churn (Non PEO)" },
  { id: "handoff-logo", group: "AM handoff", label: "Logo Churn" },
  { id: "product-churn", group: "AM handoff", label: "Product Churn" },
  { id: "sdo", group: "Initiated churn", label: "SDO Initiated" },
  { id: "im", group: "Initiated churn", label: "IM Churn" },
  { id: "proactive", group: "Initiated churn", label: "Proactive IM Churn" },
  { id: "reseller", group: "Reseller", label: "Reseller termination" },
  { id: "pfc", group: "Payroll funding", label: "PFC Initial Outreach" },
  { id: "pfc-eor", group: "Payroll funding", label: "PFC Initial Outreach (EOR)" },
  { id: "currency", group: "Payroll funding", label: "Currency Change Complete" },
  { id: "funding", group: "Payroll funding", label: "Funding Type Change Complete" },
];

const SDO_LINK = "https://help.rippling.com/s/article/360056303853";

const $ = (id) => document.getElementById(id);

const els = {
  customerName: $("customer-name"),
  firstName: $("first-name"),
  companyDba: $("company-dba"),
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
  amName: $("am-name"),
  amEmail: $("am-email"),
  meetingLink: $("meeting-link"),
  imScheduled: $("im-scheduled"),
  imRefund: $("im-refund"),
  proactiveEnd: $("proactive-end"),
  proactiveReply: $("proactive-reply"),
  resellerSubscription: $("reseller-subscription"),
  entityName: $("entity-name"),
  googleDomain: $("google-domain"),
  googleAccount: $("google-account"),
  googleEmail: $("google-email"),
  googleFields: $("google-fields"),
  payrollCountry: $("payroll-country"),
  fundingSource: $("funding-source"),
  originalType: $("original-type"),
  newType: $("new-type"),
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

function macroLabel(id) {
  const match = MACROS.find((macro) => macro.id === id);
  return match ? match.label : "Macro";
}

function defaultSubject(tab) {
  const dba = els.companyDba.value.trim();
  const company = dba || "your company";
  const subjects = {
    peo: dba ? `Rippling PEO termination — ${dba}` : "Rippling PEO termination",
    churn: dba ? `Your Rippling account closure is finalized — ${dba}` : "Your Rippling account closure is finalized",
    "handoff-logo": `Next steps to terminate your Rippling account — ${company}`,
    "product-churn": `Next steps to terminate your Rippling product — ${company}`,
    sdo: `Your Rippling cancellation has been initiated — ${company}`,
    im: `Account cancellation for ${company}`,
    proactive: `Action needed to keep your Rippling account — ${company}`,
    reseller: `Reseller cancellation — ${els.entityName.value.trim() || company}`,
    pfc: "Payroll funding change request",
    "pfc-eor": "EOR payroll funding change request",
    currency: "Your payroll funding currency is updated",
    funding: "Your payroll funding type is updated",
  };
  return subjects[tab] || "Rippling update";
}

function syncSubject() {
  if (!state.subjectTouched[state.tab]) els.subject.value = defaultSubject(state.tab);
}

function signoffLines() {
  return [];
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

function contactLink(value, label) {
  if (isBlank(value)) return { html: show(value), text: value };
  return { html: link(`mailto:${value}`, value), text: value };
}

function webLink(value) {
  if (isBlank(value)) return { html: show(value), text: value };
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return { html: link(href, value), text: value };
}

function buildHandoffEmail(kind) {
  const name = blank(els.customerName.value, MISSING.customerName);
  const manager = blank(els.amName.value, MISSING.amName);
  const email = blank(els.amEmail.value, MISSING.amEmail);
  const meeting = blank(els.meetingLink.value, MISSING.meetingLink);
  const mail = contactLink(email);
  const meet = webLink(meeting);
  const opening = kind === "product"
    ? "Thank you for confirming the reason for the request to terminate the product."
    : "Thank you for confirming the reason for your request to terminate the account.";
  const proceed = kind === "product"
    ? `To proceed with the next steps, please reach out to your Account Manager, ${manager}, at ${email}. Product terminations, contract changes, refunds, and any contract additions or removals are handled by our Account Management team.`
    : `To proceed, please contact your Account Manager, ${manager}, at ${email}. Account terminations, contract changes, refunds, and related adjustments are handled by the Account Management team to ensure everything is configured correctly.`;
  const proceedHtml = kind === "product"
    ? `To proceed with the next steps, please reach out to your Account Manager, ${show(manager)}, at ${mail.html}. Product terminations, contract changes, refunds, and any contract additions or removals are handled by our Account Management team.`
    : `To proceed, please contact your Account Manager, ${show(manager)}, at ${mail.html}. Account terminations, contract changes, refunds, and related adjustments are handled by the Account Management team to ensure everything is configured correctly.`;
  const schedule = kind === "product"
    ? `You can also schedule a call directly with your Account Manager using this meeting link: ${meeting}. Please ensure that the call is scheduled and that you receive confirmation from your Account Manager. If the call is not scheduled or the termination is not confirmed, the product may automatically renew and billing may continue.`
    : `You may also schedule a call directly using this link: ${meeting}. Once the call is completed and the termination details are confirmed, your Account Manager will initiate the formal termination process.`;
  const scheduleHtml = kind === "product"
    ? `You can also schedule a call directly with your Account Manager using this meeting link: ${meet.html}. Please ensure that the call is scheduled and that you receive confirmation from your Account Manager. If the call is not scheduled or the termination is not confirmed, the product may automatically renew and billing may continue.`
    : `You may also schedule a call directly using this link: ${meet.html}. Once the call is completed and the termination details are confirmed, your Account Manager will initiate the formal termination process.`;
  const closing = kind === "product"
    ? [
        "Scheduling this call or obtaining written confirmation from your Account Manager is important to ensure the product is terminated with the correct settings and to prevent any additional charges.",
        "Please let me know once you've scheduled the call with your Account Manager, or if you have any follow-up questions.",
      ]
    : [
        "Please note that until the termination is formally confirmed and submitted, the account will remain active and billing will continue in accordance with your contract terms.",
        "Let me know once you have connected with your Account Manager, or if you have any questions in the meantime.",
      ];
  return joinEmail([
    para(`Hi ${show(name)},`, `Hi ${name},`),
    para(opening, opening),
    para(proceedHtml, proceed),
    para(scheduleHtml, schedule),
    para(closing[0], closing[0]),
    para(closing[1], closing[1]),
    signoffPart(),
  ]);
}

function buildSdoEmail() {
  const firstName = blank(els.firstName.value, MISSING.firstName);
  const billing = blank(formatLong(els.billingEnd.value), MISSING.billingEnd);
  const dba = blank(els.companyDba.value, MISSING.companyDba);
  const cancelBy = blank(formatLong(els.cancelBy.value), MISSING.cancelBy);
  const closureTitle = `"${dba} - Complete your account closure request"`;
  const offboardingTitle = `"[IMPORTANT] ${dba} - Information About Offboarding"`;
  return joinEmail([
    para(`Hi ${show(firstName)},`, `Hi ${firstName},`),
    para(
      "The cancellation process has been initiated and the next steps to schedule the account termination will be completed within 3 business days.",
      "The cancellation process has been initiated and the next steps to schedule the account termination will be completed within 3 business days.",
    ),
    para("Here are the details:", "Here are the details:"),
    bullets([
      { html: `${strong("Billing End Date:")} ${show(billing)}`, text: `Billing End Date: ${billing}` },
      {
        html: "You'll have access to the product, including payroll, until this date.",
        text: "You'll have access to the product, including payroll, until this date.",
      },
      {
        html: `You will receive an email titled ${strong(show(closureTitle))} with instructions to complete the subscription closure within 24 hours. Please ignore this email as this step will be handled by us. ETA: 3 business days.`,
        text: `You will receive an email titled ${closureTitle} with instructions to complete the subscription closure within 24 hours. Please ignore this email as this step will be handled by us. ETA: 3 business days.`,
      },
      {
        html: `You will then receive an email titled ${strong(show(offboardingTitle))} with guidance on offboarding next steps.`,
        text: `You will then receive an email titled ${offboardingTitle} with guidance on offboarding next steps.`,
      },
      {
        html: `${strong("Important Note:")} Please review the off-boarding details to review your filing preferences and other details critical to a successful off-boarding from Rippling.`,
        text: "Important Note: Please review the off-boarding details to review your filing preferences and other details critical to a successful off-boarding from Rippling.",
      },
    ]),
    para(
      `Here's an article for your reference: ${link(SDO_LINK, "Cancel my Rippling subscription")}. If you have any questions, concerns, or require assistance with cancelling this account closure, please reach out to us before ${strong(show(cancelBy))}. We cannot accept account closure cancellation requests beyond this timeframe, as the process will already be triggered in our backend systems.`,
      `Here's an article for your reference: Cancel my Rippling subscription (${SDO_LINK}). If you have any questions, concerns, or require assistance with cancelling this account closure, please reach out to us before ${cancelBy}. We cannot accept account closure cancellation requests beyond this timeframe, as the process will already be triggered in our backend systems.`,
    ),
    signoffPart(),
  ]);
}

function buildImEmail() {
  const admin = blank(els.customerName.value, MISSING.customerName);
  const company = blank(els.companyDba.value, MISSING.companyDba);
  const scheduled = blank(formatLong(els.imScheduled.value), MISSING.scheduledDate);
  const billing = blank(formatLong(els.billingEnd.value), MISSING.billingEnd);
  const parts = [
    para(`Hi ${show(admin)},`, `Hi ${admin},`),
    para(
      `I have received a request from your Account Manager to cancel the account for ${show(company)}. The cancellation is scheduled for ${show(scheduled)} and will be effective as of ${show(billing)}.`,
      `I have received a request from your Account Manager to cancel the account for ${company}. The cancellation is scheduled for ${scheduled} and will be effective as of ${billing}.`,
    ),
  ];
  if (els.imRefund.checked) {
    parts.push(para(
      `Additionally, a refund has been processed for the entire contract. This will be credited to your account within 3-5 business days after the billing end date, ${show(billing)}.`,
      `Additionally, a refund has been processed for the entire contract. This will be credited to your account within 3-5 business days after the billing end date, ${billing}.`,
    ));
  }
  parts.push(
    para(
      "Please let me know if you have any questions or need further assistance.",
      "Please let me know if you have any questions or need further assistance.",
    ),
    signoffPart(),
  );
  return joinEmail(parts);
}

function buildProactiveEmail() {
  const admin = blank(els.customerName.value, MISSING.customerName);
  const company = blank(els.companyDba.value, MISSING.companyDba);
  const end = blank(formatLong(els.proactiveEnd.value), MISSING.proactiveEnd);
  const reply = blank(formatLong(els.proactiveReply.value), MISSING.replyBy);
  const support = contactLink("support@rippling.com");
  return joinEmail([
    para(`Hi ${show(admin)},`, `Hi ${admin},`),
    para(
      `I'm reaching out to inform you that your account ${show(company)} has been inactive for over 60 days during the Implementation phase. As a result, we will proceed with terminating your account, effective ${show(end)}.`,
      `I'm reaching out to inform you that your account ${company} has been inactive for over 60 days during the Implementation phase. As a result, we will proceed with terminating your account, effective ${end}.`,
    ),
    para(
      `To avoid this termination, please respond to this email by ${show(reply)}. If we do not hear from you by then, the account will be permanently closed, and all associated services will be discontinued.`,
      `To avoid this termination, please respond to this email by ${reply}. If we do not hear from you by then, the account will be permanently closed, and all associated services will be discontinued.`,
    ),
    para("Key Details:", "Key Details:"),
    bullets([
      { html: `${strong("Termination Date:")} ${show(end)}`, text: `Termination Date: ${end}` },
      {
        html: `${strong("Reason for Termination:")} No activity or response for over 60 days`,
        text: "Reason for Termination: No activity or response for over 60 days",
      },
      {
        html: `${strong("Next Steps:")} To prevent account closure, please contact us by ${show(reply)}`,
        text: `Next Steps: To prevent account closure, please contact us by ${reply}`,
      },
    ]),
    para(
      `If you have any questions or need assistance, please reply to this email or reach out to us at ${support.html}. We're here to help and want to ensure you have all the information you need.`,
      "If you have any questions or need assistance, please reply to this email or reach out to us at support@rippling.com. We're here to help and want to ensure you have all the information you need.",
    ),
    signoffPart(),
  ]);
}

function resellerExtra() {
  const picked = document.querySelector('input[name="reseller-extra"]:checked');
  return picked ? picked.value : "none";
}

function buildResellerEmail() {
  const firstName = blank(els.firstName.value, MISSING.firstName);
  const subscription = blank(els.resellerSubscription.value, MISSING.resellerSubscription);
  const entity = blank(els.entityName.value, MISSING.entityName);
  const parts = [
    para(`Hi ${show(firstName)},`, `Hi ${firstName},`),
    para(
      `I understand that you would like to cancel the Reseller relationship for ${show(subscription)} with Rippling, for ${show(entity)}.`,
      `I understand that you would like to cancel the Reseller relationship for ${subscription} with Rippling, for ${entity}.`,
    ),
    para(
      `Can you please confirm the Service end date to disconnect ${show(subscription)} reseller relationship with Rippling?`,
      `Can you please confirm the Service end date to disconnect ${subscription} reseller relationship with Rippling?`,
    ),
    para(
      `Rippling will terminate the billing for your ${show(subscription)} account on your desired termination date and because this billing runs on a delay, you will notice one-time charges on your account approximately 30 to 60 days after your desired termination date. You need to maintain an active payment method on file to clear existing balances and avoid future credit-collection issues.`,
      `Rippling will terminate the billing for your ${subscription} account on your desired termination date and because this billing runs on a delay, you will notice one-time charges on your account approximately 30 to 60 days after your desired termination date. You need to maintain an active payment method on file to clear existing balances and avoid future credit-collection issues.`,
    ),
  ];
  if (resellerExtra() === "dropbox") {
    parts.push(para(
      "Dropbox does not offer refunds beyond 14 days from the purchase date. As Rippling passes these charges directly to Dropbox, Rippling cannot accommodate these refund requests. If you terminate your reseller relationship with Rippling before your contract end date and enroll directly with Dropbox, you will incur charges under a new contract with Dropbox, as existing contract terms are not transferred or carried forward.",
      "Dropbox does not offer refunds beyond 14 days from the purchase date. As Rippling passes these charges directly to Dropbox, Rippling cannot accommodate these refund requests. If you terminate your reseller relationship with Rippling before your contract end date and enroll directly with Dropbox, you will incur charges under a new contract with Dropbox, as existing contract terms are not transferred or carried forward.",
    ));
  }
  if (resellerExtra() === "google") {
    const domain = blank(els.googleDomain.value, MISSING.domain);
    const account = blank(els.googleAccount.value, MISSING.googleAccount);
    const googleEmail = blank(els.googleEmail.value, MISSING.googleEmail);
    const mail = contactLink(googleEmail);
    parts.push(
      para(
        `Here is the domain ${show(domain)} associated with your Rippling account ${show(account)}.`,
        `Here is the domain ${domain} associated with your Rippling account ${account}.`,
      ),
      para(
        `In addition, please look out for an automated email from Google at ${mail.html} outlining the next steps, including directions to transfer your billing within the next 7 business days to maintain service.`,
        `In addition, please look out for an automated email from Google at ${googleEmail} outlining the next steps, including directions to transfer your billing within the next 7 business days to maintain service.`,
      ),
      para(
        "You will receive this email from Google after the reseller termination has been processed. If you fail to transfer your billing within these seven days, you may be locked out of your email.",
        "You will receive this email from Google after the reseller termination has been processed. If you fail to transfer your billing within these seven days, you may be locked out of your email.",
      ),
    );
  }
  parts.push(signoffPart());
  return joinEmail(parts);
}

function buildPfcEmail(eor) {
  const customer = blank(els.customerName.value, MISSING.customerName);
  const country = blank(els.payrollCountry.value, MISSING.country);
  const source = blank(els.fundingSource.value, MISSING.fundingSource);
  const documents = bullets([
    { html: "Most recent tax return for the entity (showing revenues)", text: "Most recent tax return for the entity (showing revenues)" },
    {
      html: "Audited or unaudited financial statements for the most recent reporting period (showing revenues)",
      text: "Audited or unaudited financial statements for the most recent reporting period (showing revenues)",
    },
  ]);
  const approved = eor
    ? bullets([
        { html: "I'll reach out with the next steps to begin the setup.", text: "I'll reach out with the next steps to begin the setup." },
        {
          html: "Please note: the full setup can take up to 1–2 weeks. Any payroll runs approved during this period must use your currently approved funding account. Your new account cannot be used until the process is complete.",
          text: "Please note: the full setup can take up to 1–2 weeks. Any payroll runs approved during this period must use your currently approved funding account. Your new account cannot be used until the process is complete.",
        },
      ])
    : bullets([
        { html: "I'll reach out with the next steps to begin the setup.", text: "I'll reach out with the next steps to begin the setup." },
        {
          html: "Please note: setup can take up to 1-2 weeks. Any payroll runs approved during this period must use your currently approved funding account, and your new funding account cannot be used until the process is complete.",
          text: "Please note: setup can take up to 1-2 weeks. Any payroll runs approved during this period must use your currently approved funding account, and your new funding account cannot be used until the process is complete.",
        },
      ]);
  const parts = [
    para(`Hi ${show(customer)},`, `Hi ${customer},`),
    para(
      eor
        ? `I understand that you would like to fund your ${show(country)} EOR payroll from a ${show(source)} bank account. When you set up Global Payroll in the Rippling Global Payroll app, your funding currency is linked to the HQ currency by default. Rippling will debit your home currency, when payroll is approved, and automatically handle currency conversion to fund the international payroll.`
        : `I understand that you would like to fund your ${show(country)} payroll from a ${show(source)} bank account. When you set up Global Payroll in the Rippling Global Payroll app, your funding currency is linked to the HQ currency by default. Rippling will debit your home currency, when payroll is approved, and automatically handle currency conversion to fund the international payroll.`,
      eor
        ? `I understand that you would like to fund your ${country} EOR payroll from a ${source} bank account. When you set up Global Payroll in the Rippling Global Payroll app, your funding currency is linked to the HQ currency by default. Rippling will debit your home currency, when payroll is approved, and automatically handle currency conversion to fund the international payroll.`
        : `I understand that you would like to fund your ${country} payroll from a ${source} bank account. When you set up Global Payroll in the Rippling Global Payroll app, your funding currency is linked to the HQ currency by default. Rippling will debit your home currency, when payroll is approved, and automatically handle currency conversion to fund the international payroll.`,
    ),
  ];
  if (!eor) {
    parts.push(para(
      "While this approach is our standard because most companies prefer this option to streamline operations, we do make exceptions for companies that do not have a manual money movement process because they generate significant revenue in the countries where they're paying employees.",
      "While this approach is our standard because most companies prefer this option to streamline operations, we do make exceptions for companies that do not have a manual money movement process because they generate significant revenue in the countries where they're paying employees.",
    ));
    parts.push(para(
      "Given the additional risk and cost associated with this approach, we require that our customers meet a set of eligibility standards in these cases. If qualified, you may be eligible to fund your payroll via the new funding method.",
      "Given the additional risk and cost associated with this approach, we require that our customers meet a set of eligibility standards in these cases. If qualified, you may be eligible to fund your payroll via the new funding method.",
    ));
    parts.push(para(
      "To be eligible for updating your funding method, your business must be a revenue-generating entity with revenue exceeding 10% of your payroll.",
      "To be eligible for updating your funding method, your business must be a revenue-generating entity with revenue exceeding 10% of your payroll.",
    ));
  } else {
    parts.push(para(
      "Given the risk and cost associated with a currency or funding method change, we require that our customers meet a set of eligibility standards in these cases. If qualified, you may be eligible to fund your payroll via the new funding method.",
      "Given the risk and cost associated with a currency or funding method change, we require that our customers meet a set of eligibility standards in these cases. If qualified, you may be eligible to fund your payroll via the new funding method.",
    ));
    parts.push(para(
      "To be eligible to update your funding method, your business must be a revenue-generating entity with revenue exceeding 10% of your payroll.",
      "To be eligible to update your funding method, your business must be a revenue-generating entity with revenue exceeding 10% of your payroll.",
    ));
    parts.push(para(
      "Please note that we will only be able to move forward with your request to change your EOR payroll funding account if your business has a local entity in the country where the funding account is located. If so, please set the entity up in Rippling if you have not already. Once the entity is set up, please submit one of the following to determine your eligibility:",
      "Please note that we will only be able to move forward with your request to change your EOR payroll funding account if your business has a local entity in the country where the funding account is located. If so, please set the entity up in Rippling if you have not already. Once the entity is set up, please submit one of the following to determine your eligibility:",
    ));
  }
  if (!eor) parts.push(para("To check your eligibility, please submit one of the following:", "To check your eligibility, please submit one of the following:"));
  parts.push(documents);
  parts.push(para("Please note, bank statements are not acceptable proof.", "Please note, bank statements are not acceptable proof."));
  parts.push(para(
    eor
      ? "Once we receive the necessary documents, our internal team will take a look to ensure you meet all the requirements. We will update you within 2 business days to inform you if your request has been approved."
      : "Once we receive the necessary documents our internal team will take a look to ensure you meet all the requirements. We will update you within 2 business days to inform your request has been approved.",
    eor
      ? "Once we receive the necessary documents, our internal team will take a look to ensure you meet all the requirements. We will update you within 2 business days to inform you if your request has been approved."
      : "Once we receive the necessary documents our internal team will take a look to ensure you meet all the requirements. We will update you within 2 business days to inform your request has been approved.",
  ));
  parts.push(para("If approved:", "If approved:"));
  parts.push(approved);
  parts.push(para("If you have any questions, please let me know.", "If you have any questions, please let me know."));
  parts.push(signoffPart());
  return joinEmail(parts);
}

function buildCurrencyEmail() {
  const customer = blank(els.customerName.value, MISSING.customerName);
  const country = blank(els.payrollCountry.value, MISSING.country);
  return joinEmail([
    para(`Hi ${show(customer)},`, `Hi ${customer},`),
    para(
      `I see that you have successfully set your new bank account as the funding method for your ${show(country)} payroll, and your next pay run is all set to be approved. Your ${show(country)} payroll is now fully set up for the new funding currency, and no further action is required.`,
      `I see that you have successfully set your new bank account as the funding method for your ${country} payroll, and your next pay run is all set to be approved. Your ${country} payroll is now fully set up for the new funding currency, and no further action is required.`,
    ),
    para(
      "Please let me know if you have any other questions, and I will be happy to assist.",
      "Please let me know if you have any other questions, and I will be happy to assist.",
    ),
    signoffPart(),
  ]);
}

function buildFundingEmail() {
  const customer = blank(els.customerName.value, MISSING.customerName);
  const country = blank(els.payrollCountry.value, MISSING.country);
  const original = blank(els.originalType.value, MISSING.originalType);
  const next = blank(els.newType.value, MISSING.newType);
  return joinEmail([
    para(`Hi ${show(customer)},`, `Hi ${customer},`),
    para(
      `I see that you have successfully updated your funding type from ${show(original)} to ${show(next)}, and your next pay run is all set to be approved. Your ${show(country)} payroll is now fully set up for the new funding type, and no further action is required.`,
      `I see that you have successfully updated your funding type from ${original} to ${next}, and your next pay run is all set to be approved. Your ${country} payroll is now fully set up for the new funding type, and no further action is required.`,
    ),
    para(
      "Please let me know if you have any other questions, and I will be happy to assist.",
      "Please let me know if you have any other questions, and I will be happy to assist.",
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
  const builders = {
    peo: buildPeoEmail,
    churn: buildChurnEmail,
    "handoff-logo": () => buildHandoffEmail("logo"),
    "product-churn": () => buildHandoffEmail("product"),
    sdo: buildSdoEmail,
    im: buildImEmail,
    proactive: buildProactiveEmail,
    reseller: buildResellerEmail,
    pfc: () => buildPfcEmail(false),
    "pfc-eor": () => buildPfcEmail(true),
    currency: buildCurrencyEmail,
    funding: buildFundingEmail,
  };
  return (builders[state.tab] || buildPeoEmail)();
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
  els.previewKicker.textContent = macroLabel(state.tab);
  if (els.googleFields) els.googleFields.hidden = resellerExtra() !== "google";
  const ready = blanks === 0;
  const wasReady = els.readiness.classList.contains("is-ready");
  els.readiness.textContent = ready ? "Ready to copy" : `${blanks} blank${blanks === 1 ? "" : "s"} still in this email`;
  if (wasReady !== ready) {
    els.readiness.classList.remove("is-flipping");
    void els.readiness.offsetWidth;
    els.readiness.classList.add("is-flipping");
  }
  els.readiness.classList.toggle("is-ready", ready);
  els.readiness.classList.toggle("has-blanks", !ready && blanks > 0);
  document.title = els.companyDba.value.trim()
    ? `Churn Support Macros — ${els.companyDba.value.trim()}`
    : "Churn Support Macros";
  save();
}

function knownMacro(id) {
  return MACROS.some((macro) => macro.id === id);
}

function renderMacroList() {
  const list = $("macro-list");
  let group = "";
  MACROS.forEach((macro) => {
    if (macro.group !== group) {
      group = macro.group;
      const heading = document.createElement("div");
      heading.className = "macro-group";
      heading.textContent = group;
      list.appendChild(heading);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "macro-btn";
    button.dataset.macro = macro.id;
    button.textContent = macro.label;
    button.setAttribute("role", "option");
    list.appendChild(button);
  });
}

function setTab(tab) {
  state.tab = knownMacro(tab) ? tab : "peo";
  document.querySelectorAll("[data-for]").forEach((panel) => {
    panel.hidden = !panel.dataset.for.split(/\s+/).includes(state.tab);
  });
  document.querySelectorAll(".macro-btn").forEach((button) => {
    const active = button.dataset.macro === state.tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  state.subjectTouched[state.tab] = state.subjectTouched[state.tab] || false;
  document.querySelector(".macro-btn.is-active")?.scrollIntoView({ block: "nearest" });
  els.letter.classList.remove("is-in");
  void els.letter.offsetWidth;
  els.letter.classList.add("is-in");
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
      amName: els.amName.value,
      amEmail: els.amEmail.value,
      meetingLink: els.meetingLink.value,
      imScheduled: els.imScheduled.value,
      imRefund: els.imRefund.checked,
      proactiveEnd: els.proactiveEnd.value,
      proactiveReply: els.proactiveReply.value,
      resellerSubscription: els.resellerSubscription.value,
      entityName: els.entityName.value,
      resellerExtra: resellerExtra(),
      googleDomain: els.googleDomain.value,
      googleAccount: els.googleAccount.value,
      googleEmail: els.googleEmail.value,
      payrollCountry: els.payrollCountry.value,
      fundingSource: els.fundingSource.value,
      originalType: els.originalType.value,
      newType: els.newType.value,
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
  els.amName.value = fields.amName || "";
  els.amEmail.value = fields.amEmail || "";
  els.meetingLink.value = fields.meetingLink || "";
  els.imScheduled.value = fields.imScheduled || "";
  els.imRefund.checked = Boolean(fields.imRefund);
  els.proactiveEnd.value = fields.proactiveEnd || "";
  els.proactiveReply.value = fields.proactiveReply || "";
  els.resellerSubscription.value = fields.resellerSubscription || "";
  els.entityName.value = fields.entityName || "";
  els.googleDomain.value = fields.googleDomain || "";
  els.googleAccount.value = fields.googleAccount || "";
  els.googleEmail.value = fields.googleEmail || "";
  els.payrollCountry.value = fields.payrollCountry || "";
  els.fundingSource.value = fields.fundingSource || "";
  els.originalType.value = fields.originalType || "";
  els.newType.value = fields.newType || "";
  document.querySelectorAll('input[name="benefits"]').forEach((input) => {
    input.checked = input.value === fields.benefits;
  });
  document.querySelectorAll('input[name="refund-scope"]').forEach((input) => {
    input.checked = input.value === (fields.refundScope || "rest of the contract period");
  });
  document.querySelectorAll('input[name="reseller-extra"]').forEach((input) => {
    input.checked = input.value === (fields.resellerExtra || "none");
  });
  state.products = Array.isArray(data.products) ? data.products.slice() : [];
  state.firstNameTouched = Boolean(data.firstNameTouched);
  state.subjectTouched = data.subjectTouched || { peo: false, churn: false };
  state.cobraTouched = Boolean(data.cobraTouched);
  state.subjects = fields.subjects || data.subjects || {};
  state.tab = knownMacro(data.tab) ? data.tab : "peo";
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
      amName: "Priya Shah",
      amEmail: "priya.shah@rippling.com",
      meetingLink: "https://rippling.example/meet/priya",
      imScheduled: "2026-04-01",
      imRefund: true,
      proactiveEnd: "2026-12-31",
      proactiveReply: "2026-12-30",
      resellerSubscription: "Dropbox",
      entityName: "Northwind Labs",
      resellerExtra: "none",
      googleDomain: "northwindlabs.com",
      googleAccount: "Northwind Labs",
      googleEmail: "admin@northwindlabs.com",
      payrollCountry: "Canada",
      fundingSource: "CAD",
      originalType: "Wire",
      newType: "Direct debit",
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

function showToast(message, success) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  els.toast.classList.toggle("is-success", Boolean(success));
  els.toast.classList.remove("is-on");
  requestAnimationFrame(() => els.toast.classList.add("is-on"));
  clearTimeout(showToast.timer);
  clearTimeout(showToast.hideTimer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("is-on");
    showToast.hideTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 280);
  }, 2200);
}

function markCopied() {
  const button = $("copy-email");
  if (!button) return;
  button.classList.remove("is-copied");
  void button.offsetWidth;
  button.classList.add("is-copied");
  clearTimeout(markCopied.timer);
  markCopied.timer = setTimeout(() => button.classList.remove("is-copied"), 1600);
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
  showToast(blanks ? `${label} copied with ${blanks} blank${blanks === 1 ? "" : "s"}` : `${label} copied`, label === "Email");
  if (label === "Email") markCopied();
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
    showToast(blanks ? `Email copied with ${blanks} blank${blanks === 1 ? "" : "s"}` : "Email copied", true);
    markCopied();
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
  $("macro-search")?.addEventListener("input", filterMacros);
  $("macro-search")?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    const first = [...document.querySelectorAll(".macro-btn")].find((button) => !button.hidden);
    if (!first) return;
    event.preventDefault();
    first.focus();
  });
  $("macro-list").addEventListener("keydown", (event) => {
    const buttons = [...document.querySelectorAll(".macro-btn")].filter((button) => !button.hidden);
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    if (event.key === "ArrowDown" && buttons[index + 1]) {
      event.preventDefault();
      buttons[index + 1].focus();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index === 0) $("macro-search")?.focus();
      else buttons[index - 1].focus();
    }
  });
  $("view-edit")?.addEventListener("click", () => setView("edit"));
  $("view-preview")?.addEventListener("click", () => setView("preview"));
  $("macro-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-macro]");
    if (!button) return;
    state.subjects = state.subjects || {};
    state.subjects[state.tab] = els.subject.value;
    const next = button.dataset.macro;
    setTab(next);
    if (state.subjectTouched[next] && state.subjects[next]) els.subject.value = state.subjects[next];
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
  check(!peo.includes("Best regards"), "no sign-off");
  check(!document.getElementById("agent-name") && !document.getElementById("signoff-style"), "sign-off fields removed");
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

  const handoff = buildHandoffEmail("logo").text;
  check(handoff.includes("Hi Jordan Lee,"), "handoff greeting");
  check(handoff.includes("Priya Shah"), "am name");
  check(handoff.includes("priya.shah@rippling.com"), "am email");
  check(handoff.includes("https://rippling.example/meet/priya"), "meeting link");
  check(!handoff.includes("terminate the product"), "logo handoff is not product");
  const product = buildHandoffEmail("product").text;
  check(product.includes("terminate the product"), "product churn wording");
  check(buildHandoffEmail("logo").html.includes('href="mailto:priya.shah@rippling.com"'), "am mailto");

  const sdo = buildSdoEmail();
  check(sdo.text.includes("- Billing End Date: April 15, 2026"), "sdo billing bullet");
  check(sdo.text.includes("Northwind Labs - Complete your account closure request"), "sdo closure title");
  check(sdo.text.includes("before April 13, 2026"), "sdo cancel deadline");
  check(sdo.html.includes(`href="${SDO_LINK}"`), "sdo article link");

  const im = buildImEmail().text;
  check(im.includes("scheduled for April 1, 2026"), "im scheduled date");
  check(im.includes("effective as of April 15, 2026"), "im billing date");
  check(im.includes("refund has been processed for the entire contract"), "im refund");
  els.imRefund.checked = false;
  check(!buildImEmail().text.includes("refund has been processed"), "im refund omitted");

  const proactive = buildProactiveEmail().text;
  check(proactive.includes("effective December 31, 2026"), "proactive end");
  check(proactive.includes("- Termination Date: December 31, 2026"), "proactive bullet");
  check(proactive.includes("contact us by December 30, 2026"), "proactive reply");
  check(buildProactiveEmail().html.includes('href="mailto:support@rippling.com"'), "support mailto");

  const reseller = buildResellerEmail().text;
  check(reseller.includes("Reseller relationship for Dropbox"), "reseller subscription");
  check(!reseller.includes("Dropbox does not offer refunds"), "dropbox section off");
  document.querySelector('input[name="reseller-extra"][value="dropbox"]').checked = true;
  check(buildResellerEmail().text.includes("Dropbox does not offer refunds"), "dropbox section on");
  document.querySelector('input[name="reseller-extra"][value="google"]').checked = true;
  const google = buildResellerEmail().text;
  check(google.includes("domain northwindlabs.com"), "google domain");
  check(google.includes("admin@northwindlabs.com"), "google email");
  check(!google.includes("Dropbox does not offer refunds"), "dropbox hidden for google");

  const pfc = buildPfcEmail(false).text;
  check(pfc.includes("fund your Canada payroll from a CAD bank account"), "pfc request");
  check(pfc.includes("- Most recent tax return"), "pfc document bullet");
  check(pfc.includes("inform your request has been approved"), "pfc approval wording");
  check(!pfc.includes("EOR payroll"), "pfc is not eor");
  const eor = buildPfcEmail(true).text;
  check(eor.includes("fund your Canada EOR payroll"), "eor request");
  check(eor.includes("local entity in the country"), "eor entity requirement");
  check(eor.includes("inform you if your request has been approved"), "eor approval wording");

  check(buildCurrencyEmail().text.includes("Your Canada payroll is now fully set up for the new funding currency"), "currency complete");
  check(buildFundingEmail().text.includes("from Wire to Direct debit"), "funding type change");
  check(MACROS.length === 12, "twelve macros");
  const previousTab = state.tab;
  MACROS.forEach((macro) => {
    state.tab = macro.id;
    const email = currentEmail();
    check(email.text.length > 40 && email.html.includes("<p"), `${macro.id} builds`);
  });
  state.tab = previousTab;
  $("macro-search").value = "reseller";
  filterMacros();
  check(visibleMacros().length === 1 && visibleMacros()[0].dataset.macro === "reseller", "search finds reseller");
  $("macro-search").value = "";
  filterMacros();
  check(visibleMacros().length === 12, "search cleared");
  setView("preview");
  check(document.body.dataset.view === "preview", "mobile preview view");
  setView("edit");
  check($("copy-email") && $("download-email"), "copy and download controls");
  downloadEmail();

  const out = $("selftest");
  out.hidden = false;
  out.textContent = failures.length ? `FAIL\n${failures.join("\n")}` : "PASS";
}

function visibleMacros() {
  return [...document.querySelectorAll(".macro-btn")].filter((button) => !button.hidden);
}

function filterMacros() {
  const query = ($("macro-search")?.value || "").trim().toLowerCase();
  document.querySelectorAll(".macro-btn").forEach((button) => {
    button.hidden = query.length > 0 && !button.textContent.toLowerCase().includes(query);
  });
  document.querySelectorAll(".macro-group").forEach((group) => {
    let sibling = group.nextElementSibling;
    let any = false;
    while (sibling && !sibling.classList.contains("macro-group")) {
      if (sibling.classList.contains("macro-btn") && !sibling.hidden) any = true;
      sibling = sibling.nextElementSibling;
    }
    group.hidden = !any;
  });
  const empty = $("macro-empty");
  if (empty) empty.hidden = visibleMacros().length > 0;
}

function setView(view) {
  document.body.dataset.view = view;
  $("view-edit")?.classList.toggle("is-active", view === "edit");
  $("view-preview")?.classList.toggle("is-active", view === "preview");
  $("view-edit")?.setAttribute("aria-selected", String(view === "edit"));
  $("view-preview")?.setAttribute("aria-selected", String(view === "preview"));
}

function init() {
  renderMacroList();
  filingChips();
  bind();
  const params = new URLSearchParams(location.search);
  if (params.has("selftest")) {
    runSelfTest();
    return;
  }
  if (params.has("sample")) loadExample();
  else restore();
  if (knownMacro(params.get("tab"))) setTab(params.get("tab"));
  else setTab(state.tab || "peo");
  if (params.get("view") === "preview" || params.get("view") === "edit") setView(params.get("view"));
}

init();
