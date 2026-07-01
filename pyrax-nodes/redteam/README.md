<!-- SPDX-License-Identifier: LicenseRef-Proprietary -->

# Public Nodes Hub — Red-Team Attack Suite

Codified adversarial attacks that assert each is **BLOCKED**. Part of the continuous red-team suite —
see the full catalogue + fuzz-farm loop docs in [`../../redteam/README.md`](../../redteam/README.md).

```bash
npm run redteam         # one-shot (exit 0 = all attacks blocked; a fail = a real vuln)
npm run redteam:watch   # continuous loop for the fuzz farm
```

Files (`*.attack.ts`):

- `hmac-ingest.attack.ts` — the announce ingest: forged/tampered/expired/**replayed** HMAC signatures,
  cross-route reuse, enum/range/over-count caps, and the oversized-body cap (I1–I10).
- `ssrf-presign-broadcast.attack.ts` — SSRF geo allow-listing (cloud metadata + private + IPv4-mapped-IPv6),
  IP-spoof map-poisoning default-deny, presign host-pinning, constant-time admin-broadcast auth, same-origin read gate (J1–J6).
- `injection-notify.attack.ts` — stored-XSS via announce fields, multiaddr composition, push-broadcast SQL
  column safety, notify email-bomb rate limit (K1–K4).

Each attack exercises the **real** handler/security function; only the DB/network boundary is mocked.
A **passing suite means every attack was defeated**; a failing test is a real vulnerability — fix the
code, never weaken the assertion.
