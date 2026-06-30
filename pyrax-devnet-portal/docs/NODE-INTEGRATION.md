# Node ↔ Portal integration (Inferno app + CLI)

How a tester's node links to the Devnet Portal and reports uptime. The portal side is **built**;
the Inferno app / CLI side is **stubbed** here as a spec — to be implemented during the app rebuild.

## Flow

1. **Pair (one-time per node).** In the portal the tester clicks **Link a node** → gets an 8-char
   pairing code (15-min TTL). In the app/CLI the tester enters the code:

   ```http
   POST /api/node/pair
   { "code": "ABCD2345", "app": "inferno", "appVersion": "0.4.0", "nodeVersion": "0.4.0", "label": "My Node" }
   → 200 { "ok": true, "nodePk": "node_…", "nodeToken": "<secret>", "heartbeatEverySec": 30, "foundingRank": 1|null }
   ```

   Store `nodeToken` securely on the device (it's the node's long-lived credential).
   `foundingRank` is set if this connect claimed one of the first-10 **Founding Tester** slots.

2. **Heartbeat (every ~30s while running).**

   ```http
   POST /api/node/heartbeat
   Authorization: Bearer <nodeToken>
   { "height": 123456, "peers": 9, "appVersion": "0.4.0", "nodeVersion": "0.4.0" }
   → 200 { "ok": true, "nextSec": 30 }
   ```

   The portal derives uptime from heartbeat presence (5-minute buckets). A node is shown **online**
   if a heartbeat arrived in the last 90s. Reward is computed on the tester's **best single node**.

## Notes for the app rebuild
- Persist `nodePk` + `nodeToken`; re-pair only if the token is lost/revoked.
- Send the app + node versions on every heartbeat so "on-time update" rewards can be credited.
- Until this is implemented, use `scripts/node-simulator.mjs <CODE>` to exercise the full flow.
- TODO (revocation): add `POST /api/node/unlink` + a tester-facing "remove node" control.
