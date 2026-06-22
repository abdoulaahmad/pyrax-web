// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// The icon set + presentational helpers (icon/orbClass/esc/heading/featureCard) now live ONCE in
// @pyrax/shared — this file was historically the source they were copied from. Re-exported here so the
// existing `./lib/ui.js` imports resolve to the shared module and the visual language never drifts
// across PYRAX properties.
export * from "@pyrax/shared";
