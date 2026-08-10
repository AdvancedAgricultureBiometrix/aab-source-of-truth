(() => {
  const api = window.AAB_IDENTITY_AUTHORITY_COMPATIBILITY_01;
  const validation = api?.validateContract?.();
  const contract = api?.getContract?.();
  const safe = api?.checkSafeRequest?.({
    action: "GET_CONTRACT",
    verificationMethod: "EMAIL",
    authoritySource: "PROTECTED_SERVER_RECORDS",
    identityKey: "AUTH_USER_ID"
  });
  const blocked = api?.checkSafeRequest?.({
    action: "GRANT_ROLE",
    grantRole: true,
    usePhoneAsVerification: true,
    useUserMetadataForAuthority: true,
    authoritySource: "BROWSER"
  });
  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const report = window.open("", "_blank", "width=1100,height=850");
  if (!report) throw new Error("Validation window was blocked.");
  const section = (title, value) => `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></section>`;
  report.document.write(`<!doctype html><html><head><title>AAB ID-01 Validation</title><style>body{font-family:Arial,sans-serif;margin:30px;background:#f4f7f5;color:#16352a}section{background:#fff;border:1px solid #cad8d1;border-radius:12px;padding:18px;margin:16px 0}h1,h2{margin-top:0}pre{white-space:pre-wrap;word-break:break-word}</style></head><body><h1>AAB ID-01 Validation</h1>${section("Contract Exists", Boolean(api))}${section("Validation Result", validation)}${section("Contract Snapshot", contract)}${section("Safe Request Check", safe)}${section("Blocked Request Check", blocked)}</body></html>`);
  report.document.close();
})();
