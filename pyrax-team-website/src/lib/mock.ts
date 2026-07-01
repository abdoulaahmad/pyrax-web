// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Shared client-side member shape. (Historically this module also carried in-memory mock data for
// a localhost preview; that data has been removed so it can never accidentally render in place of
// the real Postgres/Brevo/OTP backend. Only the TYPE remains — it's imported by the Team module to
// describe the rows returned by /api/users.)

import type { Permission } from "./permissions";
import type { MemberProfile } from "./profile";

export interface Member extends MemberProfile {
  id: string;
  isSuperuser: boolean;
  permissions: Permission[];
  status: "active" | "invited";
  lastLogin?: number;
  createdBy?: string;
}
