// Valid request bodies for the endpoints other tests build on: a CAP-01
// framework and a CAP-02 party. Each call returns a fresh, non-colliding body.

import { randomUUID } from "node:crypto";

import type { ScsFrameworkRegistrationRequest } from "../types/cap-01.js";
import type { ScsPartyRegistrationRequest } from "../types/cap-02.js";

/** An EUDR framework registration for one commodity and country of origin. */
export function frameworkRequest(commodityCode = "4001", countryOfOrigin = "TH"): ScsFrameworkRegistrationRequest {
  return {
    applicableLawsAttested: true,
    regulation: {
      regulationId: `EUDR-${randomUUID()}`,
      regulationName: "EU Deforestation Regulation",
      regulationVersion: "consolidated-2024",
      regulationDate: "2023-05-31",
      regulatoryAuthority: "European Commission",
      sourceReference: "Regulation (EU) 2023/1115",
    },
    scope: {
      commodityCode,
      commodityName: `Commodity ${commodityCode}`,
      countryOfOrigin,
      destinationMarket: "EU",
      applicableNationalLaws: ["National forestry law"],
      effectiveFrom: "2025-12-30",
    },
    evidenceRequirements: {
      deforestationEvidence: {
        referenceCutoffDate: "2020-12-31",
        requiredCoverageType: "FULL_PLOT_COVERAGE",
        acceptedSourceTypes: ["SATELLITE_IMAGE"],
        minimumResolutionMetres: 10,
        integrityRequirement: "VERIFIED",
        authorityConfirmationRequired: false,
      },
      custodyEvidence: { requiredDocumentTypes: ["PURCHASE_RECEIPT"], chainOfCustodyStandards: [], traceabilityDepth: "FULL_CHAIN" },
      plotRequirements: { geolocationRequired: true, landRegistryRequired: false, minimumPlotIdentifierType: "GPS_POLYGON", ownershipVerificationRequired: false },
      sufficiencyThreshold: { allPlotsRegistered: true, allPlotsHaveDeforestationEvidence: true, custodyChainComplete: true, noUnresolvedGaps: true, humanReviewCompleted: true },
      specLimitations: [],
    },
  };
}

/** A party registration with a unique name, registered in Thailand. */
export function partyRequest(partyType: ScsPartyRegistrationRequest["partyType"] = "LEGAL_ENTITY"): ScsPartyRegistrationRequest {
  return {
    partyType,
    partyName: `Test Party ${randomUUID()}`,
    countryOfRegistration: "TH",
    identityEvidence: { evidenceIds: [], evidenceLimitations: [] },
  };
}
