<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# Team Portal — Red-Team Attack Suite

Codified adversarial attacks that assert each is **BLOCKED**. Part of the continuous red-team suite —
see the full catalogue + fuzz-farm loop docs in [`../../redteam/README.md`](../../redteam/README.md).

```bash
npm run redteam         # one-shot (exit 0 = all attacks blocked; a fail = a real vuln)
npm run redteam:watch   # continuous loop for the fuzz farm
```

Files (`*.attack.ts`):

- `rbac-bypass.attack.ts` — Ember download gate, privilege-escalation grants, permission tampering (A1–A7).
- `auth-device-token.attack.ts` — forged/tampered/replayed/expired/cross-account Ember device tokens + sessions (B1–B7).
- `csrf.attack.ts` — cross-origin POST rejection + the safe/scoped `/api/ember/*` exemption (C1–C6).
- `otp-abuse.attack.ts` — brute-force, flood, enumeration, unicode smuggling, reuse (D1–D6).
- `presign-ssrf-injection.attack.ts` — SigV4 host-pinning, traversal, XML injection, filename XSS, phantom manifest (E1–E6).

Each attack exercises the **real** handler/security function; only the DB/network boundary is mocked.
A **passing suite means every attack was defeated**; a failing test is a real vulnerability — fix the
code, never weaken the assertion.
