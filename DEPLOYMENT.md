<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# Deploying pyrax-web

**Target:** the websites droplet `64.227.8.153`.
**Model:** GitHub Actions builds Docker images → **private GHCR** → the droplet pulls them → **Caddy** routes the four domains with automatic Let's Encrypt HTTPS. After first launch, every push to `main` is a zero-downtime rollout.

Access the droplet ONLY with the dedicated key (the many local keys otherwise trip `MaxAuthTries`):
```
ssh -o IdentitiesOnly=yes -i "$env:USERPROFILE\.ssh\pyrax_new" root@64.227.8.153
```

---

## 1. One-time droplet setup
```bash
# install Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# stack dir only — the secret file is written by CI from the org secret (see §2), not by hand
mkdir -p /opt/pyrax-web && cd /opt/pyrax-web
```
> `PYRAX_DIRECTORY_SECRET` is a GitHub **org secret**. The deploy workflow writes `/opt/pyrax-web/.env`
> from it on every deploy — root-only (`umask 077`), never committed, masked in logs — so you never
> create it by hand. It must match what the apps sign announces with, so **build the apps with the same
> value** (their build CI can read the same org secret). Manual first run before the deploy secrets are
> wired: `umask 077; printf 'PYRAX_DIRECTORY_SECRET=%s\n' '<org value>' > .env`.

Copy `docker-compose.yml` + `Caddyfile` into `/opt/pyrax-web` (CI does this automatically; for a manual first run, `scp` them up).

Open the firewall for web + keep SSH:
```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

---

## 2. The two secrets

### (a) GHCR pull token — lets the droplet pull the PRIVATE images  ← *the one you asked about*
1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token**. Scope: **`read:packages`** only. Copy it.
2. Add it (and your GitHub username) as **repo secrets** so CI can log the droplet in on every deploy:
   - Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `GHCR_PULL_TOKEN` = the token
   - `GHCR_USER` = your GitHub username (e.g. `R3AP3RW1LLY`)
3. (Manual pulls on the droplet, optional — CI does this for you each deploy:)
   ```bash
   echo "<TOKEN>" | docker login ghcr.io -u <GHCR_USER> --password-stdin
   ```
4. After CI's first push, make sure each package is **Private + linked to this repo**: org → **Packages → pyrax-web-\* → Package settings** (visibility Private; "Manage Actions access" → add the repo).

### (b) Deploy SSH key — lets Actions reach the droplet
1. Generate a dedicated deploy keypair (do this on a machine that is NOT your only copy of anything):
   ```
   ssh-keygen -t ed25519 -f ./pyrax-web-deploy -C "gh-actions-pyrax-web" -N '""'
   ```
2. Add the **public** half to the droplet:
   ```
   # on the droplet:
   echo "<contents of pyrax-web-deploy.pub>" >> ~/.ssh/authorized_keys
   ```
3. Add **repo secrets**:
   - `DROPLET_SSH_KEY` = the full **private** key (`pyrax-web-deploy`)
   - `DROPLET_HOST` = `64.227.8.153`
   - `DROPLET_USER` = `root`

**Full secret list:** `PYRAX_DIRECTORY_SECRET` (org-level — already set), `GHCR_PULL_TOKEN`, `GHCR_USER`, `DROPLET_SSH_KEY`, `DROPLET_HOST`, `DROPLET_USER`. Ensure the org secret's **Repository access** includes `pyrax-web` (org → Settings → Secrets → Actions → the secret → Repository access), or the deploy job receives an empty value.

---

## 3. First launch
Either let CI do it (push to `main`), or manually on the droplet:
```bash
cd /opt/pyrax-web
echo "<GHCR_PULL_TOKEN>" | docker login ghcr.io -u <GHCR_USER> --password-stdin
docker compose pull
docker compose up -d
docker compose ps          # all services Up; caddy on 80/443
```

---

## 4. Point DNS — the only thing left
Create **A records → `64.227.8.153`** for:
`pyraxchain.com` · `www.pyraxchain.com` · `nodes.pyraxchain.com` · `explorer.pyraxchain.com` · `peers.pyraxchain.com`

Caddy provisions HTTPS automatically the first time each name resolves to the droplet — no cert steps. Within a minute of DNS propagating, every site is live on HTTPS.

---

## 5. Updates (zero-downtime)
Push to `main` → CI rebuilds the changed images, pushes to GHCR, and rolls them out (`docker compose pull && up -d`). Caddy keeps serving throughout; static (nginx) swaps are sub-second and Caddy retries the upstream, so there is no visible downtime. Roll back by re-running an older successful workflow (or `TAG=<sha> docker compose up -d` on the droplet).

## Notes
- **Explorer indexer is throttled** (`INGEST_BATCH=2`, `RECEIPT_CONCURRENCY=1`, `INGEST_INTERVAL_MS=8000`) so reading the node's public RPC can't starve block production. When the nodes droplet is back, move the indexer there (localhost to the node) and drop the throttle.
- The indexer's SQLite lives in the `explorer_data` volume; wipe it (`docker compose down && docker volume rm pyrax-web_explorer_data`) if the chain is re-genesised.
