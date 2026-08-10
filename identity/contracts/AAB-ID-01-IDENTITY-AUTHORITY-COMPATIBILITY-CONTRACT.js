(function (global) {
  "use strict";

  var BUILD_ID = "ID-01";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Identity and Authority Compatibility Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY",
      "FAIL_CLOSED",
      "NO_AUTHORITY_GRANT",
      "NO_DATABASE_WRITE",
      "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Preserve compatibility between authenticated AAB accounts and canonical protected authority records during the identity transition.",
    doctrine: Object.freeze({
      accountIsNotAuthority: true,
      emailIsOnlyVerificationMethod: true,
      canonicalIdentityKey: "AUTH_USER_ID",
      canonicalAuthoritySource: "PROTECTED_SERVER_RECORDS",
      existingAuthorityRecordsRemainCanonical: true,
      browserCannotAssignAuthority: true,
      phoneCannotVerifyIdentity: true,
      userMetadataCannotGrantAuthority: true,
      scientistAuthorityPreserved: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT",
      "VALIDATE_CONTRACT",
      "CHECK_COMPATIBILITY",
      "RESOLVE_READ_ONLY_IDENTITY_CONTEXT"
    ]),
    prohibitedActions: Object.freeze([
      "GRANT_ROLE",
      "REVOKE_ROLE",
      "CREATE_MEMBERSHIP",
      "UPDATE_MEMBERSHIP",
      "ASSIGN_AUTHORITY",
      "WRITE_DATABASE",
      "ENABLE_AUTH",
      "CREATE_USER",
      "VERIFY_BY_PHONE"
    ]),
    nextAllowedBuild: "ID-02"
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validateContract() {
    var failures = [];
    if (CONTRACT.buildId !== BUILD_ID) failures.push("BUILD_ID_MISMATCH");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.accountIsNotAuthority !== true) failures.push("ACCOUNT_AUTHORITY_SEPARATION_MISSING");
    if (CONTRACT.doctrine.emailIsOnlyVerificationMethod !== true) failures.push("EMAIL_ONLY_VERIFICATION_NOT_LOCKED");
    if (CONTRACT.doctrine.canonicalIdentityKey !== "AUTH_USER_ID") failures.push("IMMUTABLE_AUTH_ID_NOT_CANONICAL");
    if (CONTRACT.doctrine.canonicalAuthoritySource !== "PROTECTED_SERVER_RECORDS") failures.push("PROTECTED_AUTHORITY_SOURCE_NOT_CANONICAL");
    if (CONTRACT.doctrine.browserCannotAssignAuthority !== true) failures.push("BROWSER_AUTHORITY_BLOCK_MISSING");
    if (CONTRACT.doctrine.phoneCannotVerifyIdentity !== true) failures.push("PHONE_VERIFICATION_BLOCK_MISSING");
    if (CONTRACT.doctrine.userMetadataCannotGrantAuthority !== true) failures.push("USER_METADATA_AUTHORITY_BLOCK_MISSING");

    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length === 0 ? PASS : "FAIL_CLOSED",
      ready: failures.length === 0,
      failureReasons: failures,
      mode: "READ_ONLY_COMPATIBILITY_CONTRACT",
      nextAllowedBuild: failures.length === 0 ? CONTRACT.nextAllowedBuild : null
    });
  }

  function checkSafeRequest(request) {
    var input = request && typeof request === "object" ? request : {};
    var reasons = [];
    var action = String(input.action || "").trim().toUpperCase();
    var authoritySource = String(input.authoritySource || "").trim().toUpperCase();
    var verificationMethod = String(input.verificationMethod || "").trim().toUpperCase();
    var identityKey = String(input.identityKey || "").trim().toUpperCase();

    if (!CONTRACT.allowedActions.includes(action)) reasons.push("ACTION_NOT_ALLOWED_READ_ONLY");
    if (CONTRACT.prohibitedActions.includes(action)) reasons.push("OPERATIONAL_ACTION_BLOCKED");
    if (input.grantRole === true || input.assignAuthority === true) reasons.push("AUTHORITY_GRANT_BLOCKED");
    if (input.createMembership === true || input.updateMembership === true) reasons.push("MEMBERSHIP_MUTATION_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.usePhoneAsVerification === true || verificationMethod === "PHONE") reasons.push("PHONE_VERIFICATION_BLOCKED");
    if (input.useUserMetadataForAuthority === true || authoritySource === "USER_METADATA") reasons.push("USER_METADATA_AUTHORITY_BLOCKED");
    if (authoritySource && authoritySource !== "PROTECTED_SERVER_RECORDS") reasons.push("NON_CANONICAL_AUTHORITY_SOURCE_BLOCKED");
    if (verificationMethod && verificationMethod !== "EMAIL") reasons.push("NON_EMAIL_VERIFICATION_BLOCKED");
    if (identityKey && identityKey !== "AUTH_USER_ID") reasons.push("NON_CANONICAL_IDENTITY_KEY_BLOCKED");

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

  global.AAB_IDENTITY_AUTHORITY_COMPATIBILITY_01 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    validateContract: validateContract,
    checkSafeRequest: checkSafeRequest
  });
})(window);
