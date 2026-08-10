(function (global) {
  "use strict";

  var BUILD_ID = "ID-02";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var ALLOWED_LINK_STATES = Object.freeze(["PENDING", "LINKED", "SUSPENDED", "REVOKED"]);

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Identity to Actor Link Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY",
      "FAIL_CLOSED",
      "SYNTHETIC_VALIDATION_ONLY",
      "NO_AUTHORITY_GRANT",
      "NO_DATABASE_WRITE",
      "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Define and validate the immutable, one-account-to-one-actor identity link without changing canonical AAB authority records.",
    dependencies: Object.freeze({
      requiredBuild: "ID-01",
      requiredNamespace: "AAB_IDENTITY_AUTHORITY_COMPATIBILITY_01",
      requiredResult: "PASS_READY_READ_ONLY"
    }),
    doctrine: Object.freeze({
      authUserIdIsImmutableIdentityKey: true,
      actorIdIsExistingCanonicalPersonKey: true,
      verifiedEmailRequiredForActiveLink: true,
      oneAuthAccountPerActor: true,
      oneActorPerAuthAccount: true,
      accountLinkDoesNotGrantAuthority: true,
      membershipsRemainCanonicalAuthoritySource: true,
      missingOrAmbiguousLinkFailsClosed: true,
      suspendedOrRevokedLinkFailsClosed: true,
      browserCannotCreateOrAlterLink: true,
      userMetadataCannotSupplyActorOrAuthority: true
    }),
    linkStates: ALLOWED_LINK_STATES,
    allowedActions: Object.freeze([
      "GET_CONTRACT",
      "VALIDATE_CONTRACT",
      "RESOLVE_SYNTHETIC_LINK",
      "CHECK_LINK_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "CREATE_LINK",
      "UPDATE_LINK",
      "DELETE_LINK",
      "ACTIVATE_LINK",
      "GRANT_ROLE",
      "CREATE_MEMBERSHIP",
      "WRITE_DATABASE",
      "CREATE_USER",
      "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-03"
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalise(value) {
    return String(value || "").trim();
  }

  function normaliseEmail(value) {
    return normalise(value).toLowerCase();
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function dependencyStatus() {
    var dependency = global.AAB_IDENTITY_AUTHORITY_COMPATIBILITY_01;
    var validation = dependency && typeof dependency.validateContract === "function"
      ? dependency.validateContract()
      : null;
    return {
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(validation && validation.result === CONTRACT.dependencies.requiredResult)
    };
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_01_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_01_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.authUserIdIsImmutableIdentityKey !== true) failures.push("IMMUTABLE_AUTH_ID_NOT_LOCKED");
    if (CONTRACT.doctrine.accountLinkDoesNotGrantAuthority !== true) failures.push("ACCOUNT_AUTHORITY_SEPARATION_MISSING");
    if (CONTRACT.doctrine.membershipsRemainCanonicalAuthoritySource !== true) failures.push("CANONICAL_AUTHORITY_SOURCE_NOT_PRESERVED");
    if (CONTRACT.doctrine.missingOrAmbiguousLinkFailsClosed !== true) failures.push("FAIL_CLOSED_LINK_RESOLUTION_MISSING");
    if (CONTRACT.doctrine.userMetadataCannotSupplyActorOrAuthority !== true) failures.push("USER_METADATA_BOUNDARY_MISSING");

    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length === 0 ? PASS : "FAIL_CLOSED",
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_IDENTITY_LINK_CONTRACT",
      nextAllowedBuild: failures.length === 0 ? CONTRACT.nextAllowedBuild : null
    });
  }

  function resolveSyntheticLink(request) {
    var input = request && typeof request === "object" ? request : {};
    var account = input.account && typeof input.account === "object" ? input.account : {};
    var links = Array.isArray(input.links) ? input.links : [];
    var actors = Array.isArray(input.actors) ? input.actors : [];
    var reasons = [];
    var authUserId = normalise(account.authUserId);
    var email = normaliseEmail(account.email);

    if (!UUID_PATTERN.test(authUserId)) reasons.push("INVALID_AUTH_USER_ID");
    if (account.emailVerified !== true) reasons.push("EMAIL_NOT_VERIFIED");
    if (!email || !email.includes("@")) reasons.push("VALID_EMAIL_REQUIRED");
    if (account.phoneVerified === true) reasons.push("PHONE_VERIFICATION_NOT_ACCEPTED");
    if (account.userMetadataActorId || account.userMetadataRole) reasons.push("USER_METADATA_IDENTITY_OR_AUTHORITY_BLOCKED");

    var matchingLinks = links.filter(function (link) {
      return normalise(link.authUserId) === authUserId;
    });
    if (matchingLinks.length === 0) reasons.push("IDENTITY_LINK_NOT_FOUND");
    if (matchingLinks.length > 1) reasons.push("DUPLICATE_AUTH_USER_LINK");

    var link = matchingLinks.length === 1 ? matchingLinks[0] : null;
    if (link) {
      var actorId = normalise(link.actorId);
      var state = normalise(link.state).toUpperCase();
      if (!ALLOWED_LINK_STATES.includes(state)) reasons.push("INVALID_LINK_STATE");
      if (state !== "LINKED") reasons.push("LINK_NOT_ACTIVE");
      if (normaliseEmail(link.verifiedEmail) !== email) reasons.push("VERIFIED_EMAIL_MISMATCH");
      if (!actorId) reasons.push("ACTOR_ID_REQUIRED");

      var accountIdsForActor = unique(links.filter(function (candidate) {
        return normalise(candidate.actorId) === actorId && normalise(candidate.state).toUpperCase() !== "REVOKED";
      }).map(function (candidate) { return normalise(candidate.authUserId); }));
      if (accountIdsForActor.length > 1) reasons.push("ACTOR_LINKED_TO_MULTIPLE_ACCOUNTS");

      var matchingActors = actors.filter(function (actor) {
        return normalise(actor.actorId) === actorId;
      });
      if (matchingActors.length === 0) reasons.push("CANONICAL_ACTOR_NOT_FOUND");
      if (matchingActors.length > 1) reasons.push("AMBIGUOUS_CANONICAL_ACTOR");
      if (matchingActors.length === 1 && matchingActors[0].active === false) reasons.push("CANONICAL_ACTOR_INACTIVE");
    }

    var resolved = reasons.length === 0;
    return Object.freeze({
      buildId: BUILD_ID,
      result: resolved ? "IDENTITY_ACTOR_LINK_RESOLVED_READ_ONLY" : "IDENTITY_ACTOR_LINK_BLOCKED",
      resolved: resolved,
      failureReasons: reasons,
      identityContext: resolved ? Object.freeze({
        authUserId: authUserId,
        actorId: normalise(link.actorId),
        verifiedEmail: email,
        linkState: "LINKED",
        authoritySource: "PROTECTED_SERVER_MEMBERSHIP_RECORDS",
        authorityResolved: false
      }) : null,
      authorityGranted: false,
      mutationPerformed: false,
      dataWritten: false,
      syntheticOnly: true
    });
  }

  function checkSafeRequest(request) {
    var input = request && typeof request === "object" ? request : {};
    var action = normalise(input.action).toUpperCase();
    var reasons = [];
    if (!CONTRACT.allowedActions.includes(action)) reasons.push("ACTION_NOT_ALLOWED_READ_ONLY");
    if (CONTRACT.prohibitedActions.includes(action)) reasons.push("OPERATIONAL_ACTION_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.createLink === true || input.updateLink === true || input.deleteLink === true) reasons.push("IDENTITY_LINK_MUTATION_BLOCKED");
    if (input.grantRole === true || input.assignAuthority === true) reasons.push("AUTHORITY_GRANT_BLOCKED");
    if (input.createMembership === true) reasons.push("MEMBERSHIP_CREATION_BLOCKED");
    if (input.useUserMetadata === true) reasons.push("USER_METADATA_IDENTITY_OR_AUTHORITY_BLOCKED");
    if (input.liveSupabase === true || input.enableAuth === true) reasons.push("LIVE_SUPABASE_OR_AUTH_ACTIVATION_BLOCKED");

    return Object.freeze({
      buildId: BUILD_ID,
      result: reasons.length === 0 ? "SAFE_READ_ONLY_REQUEST" : BLOCKED,
      allowed: reasons.length === 0,
      failureReasons: reasons,
      authorityGranted: false,
      mutationPerformed: false,
      dataWritten: false
    });
  }

  function getContract() {
    return clone(CONTRACT);
  }

  global.AAB_IDENTITY_ACTOR_LINK_02 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    validateContract: validateContract,
    resolveSyntheticLink: resolveSyntheticLink,
    checkSafeRequest: checkSafeRequest
  });
})(window);
