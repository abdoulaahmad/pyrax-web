// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Domains / social / per-network RPC endpoints are the single source in @pyrax/shared (endpoints.ts) —
// re-exported here so existing `./lib/endpoints.js` imports keep working. To wire a network's live RPC
// or change a domain, edit @pyrax/shared/src/endpoints.ts ONCE and every PYRAX property inherits it.
export * from "@pyrax/shared";
