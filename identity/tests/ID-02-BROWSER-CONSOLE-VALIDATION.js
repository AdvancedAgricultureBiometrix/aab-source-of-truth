(() => {
  const api = window.AAB_IDENTITY_ACTOR_LINK_02;
  const account = { authUserId: "11111111-1111-4111-8111-111111111111", email: "scientist@example.org", emailVerified: true };
  const validLink = { authUserId: account.authUserId, actorId: "22222222-2222-4222-8222-222222222222", verifiedEmail: account.email, state: "LINKED" };
  const validActor = { actorId: validLink.actorId, active: true };
  const validation = api?.validateContract?.();
  const contract = api?.getContract?.();
  const safe = api?.resolveSyntheticLink?.({ account, links: [validLink], actors: [validActor] });
  const blocked = api?.checkSafeRequest?.({ action: "CREATE_LINK", createLink: true, grantRole: true, liveSupabase: true });
  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const report = window.open("", "_blank", "width=1100,height=850");
  if (!report) throw new Error("Validation window was blocked.");
  const section = (title, value) => `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></section>`;
  report.document.write(`<!doctype html><html><head><title>AAB ID-02 Validation</title><style>body{font-family:Arial,sans-serif;margin:30px;background:#f4f7f5;color:#16352a}section{background:#fff;border:1px solid #cad8d1;border-radius:12px;padding:18px;margin:16px 0}h1,h2{margin-top:0}pre{white-space:pre-wrap;word-break:break-word}</style></head><body><h1>AAB ID-02 Validation</h1>${section("Contract Exists", Boolean(api))}${section("Validation Result", validation)}${section("Contract Snapshot", contract)}${section("Safe Identity Link Check", safe)}${section("Blocked Request Check", blocked)}</body></html>`);
  report.document.close();
})();
