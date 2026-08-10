(() => {
  const api = window.AAB_PROTECTED_MEMBERSHIP_AUTHORITY_RESOLVER_03;
  const identityContext = {
    authUserId: "11111111-1111-4111-8111-111111111111",
    actorId: "22222222-2222-4222-8222-222222222222",
    verifiedEmail: "scientist@example.org",
    linkState: "LINKED",
    authoritySource: "PROTECTED_SERVER_MEMBERSHIP_RECORDS",
    authorityResolved: false
  };
  const memberships = [{
    membershipId: "33333333-3333-4333-8333-333333333333",
    actorId: identityContext.actorId,
    roleCode: "SCIENTIST",
    state: "ACTIVE",
    scopeType: "INSTITUTION",
    scopeId: "44444444-4444-4444-8444-444444444444",
    countryId: "55555555-5555-4555-8555-555555555555",
    institutionId: "44444444-4444-4444-8444-444444444444"
  }];

  const validation = api?.validateContract?.();
  const contract = api?.getContract?.();
  const safe = api?.resolveSyntheticAuthority?.({ identityContext, memberships });
  const noMembership = api?.resolveSyntheticAuthority?.({ identityContext, memberships: [] });
  const blocked = api?.checkSafeRequest?.({
    action: "GRANT_ROLE",
    grantRole: true,
    createMembership: true,
    browserRole: "PLATFORM_ADMIN",
    routeDashboard: true,
    liveSupabase: true
  });

  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const report = window.open("", "_blank", "width=1100,height=900");
  if (!report) throw new Error("Validation window was blocked.");
  const section = (title, value) => `
    <section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></section>`;

  report.document.write(`<!doctype html><html><head><title>AAB ID-03 Validation</title>
    <style>body{font-family:Arial,sans-serif;margin:30px;background:#f4f7f5;color:#16352a}section{background:#fff;border:1px solid #cad8d1;border-radius:12px;padding:18px;margin:16px 0}h1,h2{margin-top:0}pre{white-space:pre-wrap;word-break:break-word}</style>
    </head><body><h1>AAB ID-03 Validation</h1>
    ${section("Contract Exists", Boolean(api))}
    ${section("Validation Result", validation)}
    ${section("Contract Snapshot", contract)}
    ${section("Safe Protected Membership Check", safe)}
    ${section("No Membership Fail-Closed Check", noMembership)}
    ${section("Blocked Request Check", blocked)}
    </body></html>`);
  report.document.close();
})();
