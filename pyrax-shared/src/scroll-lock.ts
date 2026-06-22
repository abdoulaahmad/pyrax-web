// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Ref-counted body scroll lock, shared by the mobile drawer and the command palette so that
// closing ONE surface never unlocks scrolling while the OTHER is still open. Each open() calls
// lockScroll(); each close() calls unlockScroll(); the body only unlocks when the count hits 0.

let locks = 0;

export function lockScroll(): void {
  locks += 1;
  document.body.style.overflow = "hidden";
}

export function unlockScroll(): void {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = "";
}
