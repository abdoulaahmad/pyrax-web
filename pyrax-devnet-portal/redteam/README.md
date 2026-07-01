<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# Devnet Tester Portal — Red-Team Attack Suite

Codified adversarial attacks that assert each is **BLOCKED**. Part of the continuous red-team suite —
see the full catalogue + fuzz-farm loop docs in [`../../redteam/README.md`](../../redteam/README.md).

```bash
npm run redteam         # one-shot (exit 0 = all attacks blocked; a fail = a real vuln)
npm run redteam:watch   # continuous loop for the fuzz farm
```

Files (`*.attack.ts`):

- `rbac-device-suspend.attack.ts` — tester→staff escalation, `rewards.admin` superuser-only, device tokens,
  and the **suspended-tester ⇒ 401 immediate lockout** (F1–F7).
- `csrf-otp.attack.ts` — cross-origin POST rejection + scoped `/api/app/*` & node exemptions; OTP brute/flood/reuse/unicode;
  **suspended testers never issued a code** (G1–G8).
- `presign-ssrf-node.attack.ts` — SigV4 host-pinning, upload-key traversal into the tester's own prefix,
  RBAC/size gates, hostile listing XML, node heartbeat token gate (H1–H6).

Each attack exercises the **real** handler/security function; only the DB/network boundary is mocked.
A **passing suite means every attack was defeated**; a failing test is a real vulnerability — fix the
code, never weaken the assertion.
