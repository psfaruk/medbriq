import { storeKind } from "@/lib/data";

/**
 * Module flag registry & eligibility controls
 * (docs/ARCHITECTURE_CORRECTIONS.md #2, #5, #18).
 *
 * Rules:
 * - A module disabled here is disabled EVERYWHERE — API routes, UI entry
 *   points and background jobs all consult this registry.
 * - Disabled modules answer with `503 MODULE_DISABLED` and the gate reason,
 *   never a silent 404.
 * - Flipping a regulated module (telehealth, payments) to enabled requires the
 *   Phase 0 research dossier, counsel sign-off and a recorded human approval
 *   (audit-logged MODULE_ENABLED naming the approver). No workstream may
 *   enable a module on its own.
 */

export type ModuleName =
  | "doctorDiscovery"
  | "appointmentBooking"
  | "telehealth"
  | "payments";

export type ModuleGate = {
  /** Human-readable description of what the module covers. */
  description: string;
  /** Why the module is disabled (shown in 503 responses + UI). */
  disabledReason: string | null;
};

export const MODULE_INFO: Record<ModuleName, ModuleGate> = {
  doctorDiscovery: {
    description: "Verified doctor directory, search and profiles (Bangladesh).",
    disabledReason: null,
  },
  appointmentBooking: {
    description:
      "Physical (in-person) appointment booking with doctor-wise patient classification and fees.",
    // Residency gate: patient visit history must not leave the approved
    // region before the Phase 0 decision (corrections #5/#6).
    disabledReason:
      "Booking requires the Prisma-backed store. The Firestore path is frozen pending the Phase 0 data-residency review (docs/ARCHITECTURE_CORRECTIONS.md #5).",
  },
  telehealth: {
    description: "Remote clinical consultations (video) and remote prescribing.",
    disabledReason:
      "Telehealth is gated on the Phase 0 regulatory feasibility review (DGHS National Telehealth Guidelines, BMDC telemedicine guidance, licensing analysis) — docs/ARCHITECTURE_CORRECTIONS.md #3/#4/#14.",
  },
  payments: {
    description:
      "Online payment collection, custody, split settlement and platform wallets.",
    disabledReason:
      "Payments are gated on legal + payment-provider approval (Bangladesh Bank / PSP requirements). No custody, settlement or wallet code may run — docs/ARCHITECTURE_CORRECTIONS.md #13.",
  },
};

/**
 * Whether a module is currently eligible to run, evaluated per-request.
 *
 * - doctorDiscovery: enabled (Bangladesh scope is enforced in the data layer).
 * - appointmentBooking: enabled ONLY on the Prisma-backed store. The fee
 *   system stores patient visit history, which must not leave the approved
 *   region before the Phase 0 residency decision.
 * - telehealth / payments: disabled by the Phase 0 / approvals gates.
 */
export function isModuleEnabled(module: ModuleName): boolean {
  switch (module) {
    case "doctorDiscovery":
      return true;
    case "appointmentBooking":
      return storeKind() === "prisma";
    case "telehealth":
    case "payments":
      return false;
  }
}

/** Thrown when a disabled module's surface is reached; api.ts maps it to 503. */
export class ModuleDisabledError extends Error {
  readonly module: ModuleName;
  constructor(module: ModuleName) {
    const info = MODULE_INFO[module];
    super(
      info.disabledReason
        ? `${module} is disabled: ${info.disabledReason}`
        : `${module} is disabled.`
    );
    this.name = "ModuleDisabledError";
    this.module = module;
  }
}

/** Route-level guard: throws ModuleDisabledError when the module is off. */
export function requireModule(module: ModuleName): void {
  if (!isModuleEnabled(module)) {
    throw new ModuleDisabledError(module);
  }
}
