// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Help-guide content — the single source for both the console's "Guides" mega
// menu (metadata) and the docs hub (full content). Add a guide here and it shows
// up in both automatically. Store text RAW (use real "&", ">", "<"); the renderer
// HTML-escapes it.

export interface GuideBlock {
  type: "prose" | "callout" | "list" | "steps" | "commands" | "table";
  text?: string;
  tone?: "info" | "tip" | "warn";
  items?: { title?: string; body?: string; text?: string; label?: string; code?: string; note?: string }[];
  columns?: string[];
  rows?: string[][];
}
export interface GuideSection {
  heading: string;
  blocks: GuideBlock[];
}
export interface Guide {
  slug: string;
  title: string;
  eyebrow: string;
  icon: string;
  summary: string;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: "manual-connection",
    title: "Connect manually",
    eyebrow: "Connecting",
    icon: "🔌",
    summary: "Add a peer by hand if automatic discovery can't reach anyone.",
    sections: [
      {
        heading: "How automatic discovery works",
        blocks: [
          {
            type: "prose",
            text: "PYRAX is bootstrapless. In almost all cases you never touch this — your node discovers and connects to peers on its own. This page is for the rare case where automatic discovery can't reach anyone and you need to add a peer by hand.",
          },
          {
            type: "list",
            items: [
              { text: "On a LAN or VPN, nodes find each other automatically over mDNS — nothing to configure." },
              { text: "Across the internet, the PYRAX app announces your node to this directory and continuously dials the other live nodes it lists — so you connect with no manual steps." },
              { text: "The directory is convenience discovery only — it never signs or validates chain data. Nodes verify each other peer-to-peer." },
            ],
          },
        ],
      },
      {
        heading: "Connect manually (if auto-connect fails)",
        blocks: [
          {
            type: "prose",
            text: "If your node shows no peers for a while (a strict firewall, an unusual NAT, or the directory being unreachable), add a peer by hand:",
          },
          {
            type: "steps",
            items: [
              { title: "Pick your network", body: "On the directory, choose your network (e.g. Internal Devnet 1.0) from the dropdown so you only see peers on the same chain." },
              { title: "Copy a peer's Dial address", body: "Each card has a Dial field — a multiaddr like /ip4/203.0.113.7/tcp/30303/p2p/12D3KooW…. Click its copy button. This is the only value you need; the relay key is reference-only and isn't pasted anywhere." },
              { title: "Paste it into the app's Connect tab", body: "In the PYRAX desktop app, open Connect, paste the Dial address into \"Peers to dial\" (one per line — you can add several), and click Apply. The node restarts and dials your peer." },
              { title: "You're connected", body: "Within a few seconds the Peers tab shows the new connection and your node begins syncing. Once you're reachable, others auto-discover you too." },
            ],
          },
        ],
      },
      {
        heading: "Tips",
        blocks: [
          {
            type: "list",
            items: [
              { text: "To be reachable from the internet, forward your node's TCP port (default 30303) — see the Port forwarding guide." },
              { text: "On the same LAN/VPN you usually don't need any of this — mDNS connects you automatically." },
              { text: "You can paste several Dial addresses (one per line) to connect to multiple peers at once." },
              { text: "Only add peers on the same network — a node ignores peers on a different chain." },
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "port-forwarding",
    title: "Port forwarding & firewalls",
    eyebrow: "Networking",
    icon: "🌐",
    summary: "Forward TCP 30303 and open your firewall so other peers can dial in.",
    sections: [
      {
        heading: "Do you actually need this?",
        blocks: [
          {
            type: "prose",
            text: "A PYRAX node works fine behind a normal home router without any setup: it dials OUT to reachable peers and syncs the chain. You only need port forwarding if you want other nodes to be able to dial IN to you — i.e. become a reachable peer. Being reachable helps the network and lets others connect to you, but it is optional. If you just want to run a node and stay in sync, you can skip this entire guide.",
          },
          {
            type: "list",
            items: [
              { text: "Outbound-only (default): no config needed. mDNS finds peers on your LAN/VPN automatically; across the internet the app announces you to the directory and continuously dials the live nodes it lists." },
              { text: "Inbound (reachable): you want others to dial you. This requires forwarding TCP 30303 through your router AND opening your OS firewall — both steps below." },
              { text: "How to tell which you are: in the desktop app, a reachable peer shows its country flag (geolocated from its public IP). If you are only outbound, others can't initiate a connection to you." },
            ],
          },
          {
            type: "callout",
            tone: "info",
            text: "Port is TCP 30303, NOT UDP. A PYRAX node only LISTENS on TCP 30303 for inbound peers. QUIC/UDP is used only when the node dials OUT, so there is nothing inbound to forward on UDP. Forward TCP only. (Internal dev seed nodes use 30310; public users always use 30303. If you changed the node's --p2p-port, forward that port instead.)",
          },
        ],
      },
      {
        heading: "Step 1 — Find your gateway IP and your LAN IP",
        blocks: [
          {
            type: "prose",
            text: "You need two addresses: your router's gateway IP (the address you log into) and the LAN IP of the machine running the node (where traffic gets forwarded). Run the command for your OS.",
          },
          {
            type: "commands",
            items: [
              { label: "Windows", code: "ipconfig", note: "Read 'Default Gateway' (your router, e.g. 192.168.1.1) and 'IPv4 Address' (this machine's LAN IP, e.g. 192.168.1.42) under your active adapter." },
              { label: "macOS", code: "ipconfig getifaddr en0\nnetstat -nr | grep default", note: "First line = this Mac's LAN IP (use en1 on Wi-Fi-only models). Second = gateway. Or: System Settings > Network > Details > TCP/IP." },
              { label: "Linux", code: "ip addr show\nip route | grep default", note: "'ip addr' shows this machine's LAN IP (inet line, e.g. 192.168.1.42); 'ip route' shows the gateway via 'default via …'." },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            text: "Private LAN IPs start with 192.168.x.x, 10.x.x.x, or 172.16–31.x.x. Write down both numbers — you'll enter them in Steps 2 and 3.",
          },
        ],
      },
      {
        heading: "Step 2 — Pin the machine's LAN IP (static IP / DHCP reservation)",
        blocks: [
          {
            type: "prose",
            text: "DHCP can hand your machine a different LAN IP after a reboot, which silently breaks the forward (traffic now points at the wrong device). Lock the IP so the rule keeps working. A DHCP reservation on the router is the most foolproof method.",
          },
          {
            type: "steps",
            items: [
              { title: "Preferred: DHCP reservation (on the router)", body: "In the router admin, find the DHCP / LAN / Connected Devices area, locate your machine (match by its MAC address or current IP), and reserve/bind its current LAN IP. The router will always hand that machine the same address." },
              { title: "Alternative: static IP on the machine", body: "Set a fixed IP on the device itself. Pick an address inside your subnet but OUTSIDE the DHCP pool to avoid conflicts (e.g. if DHCP serves .100–.200, use .50). Set gateway = your router IP and a DNS server (your router IP or 1.1.1.1 / 8.8.8.8)." },
              { title: "Note the final LAN IP", body: "Whatever address you settle on, that is the IP you point the port-forward rule at in Step 3." },
            ],
          },
        ],
      },
      {
        heading: "Step 3 — Add the port-forward rule (TCP 30303)",
        blocks: [
          {
            type: "prose",
            text: "Log into your router's admin page (type the gateway IP from Step 1 into a browser, or use your ISP's app). Find the port-forwarding page (Step 4 table) and add ONE rule with these values.",
          },
          {
            type: "table",
            columns: ["Field", "Value"],
            rows: [
              ["Name / Service", "PYRAX"],
              ["Protocol", "TCP only"],
              ["External / WAN port", "30303 (start and end both 30303)"],
              ["Internal / LAN port", "30303"],
              ["Internal IP / device", "Your machine's pinned LAN IP from Step 2"],
              ["Enabled", "Yes / On"],
            ],
          },
          {
            type: "callout",
            tone: "tip",
            text: "If the form has only a single port field, enter 30303 once. If it asks for a range, set both start and end to 30303. Leave UDP unchecked. Save/Apply — some routers reboot briefly. If you run the node on a custom --p2p-port, substitute that number everywhere.",
          },
        ],
      },
      {
        heading: "Step 4 — Where the port-forwarding page lives (by brand)",
        blocks: [
          {
            type: "callout",
            tone: "warn",
            text: "Firmware varies. These menu paths are accurate for current/common firmware but your exact model may differ. On many TP-Link, ASUS, and D-Link routers the feature is labeled 'Virtual Server' rather than 'Port Forwarding' — they mean the same thing. Several ISPs (Xfinity, Spectrum, often AT&T/Nest) require their phone app, not a browser admin page.",
          },
          {
            type: "table",
            columns: ["Brand / ISP", "Where to go", "Default admin address"],
            rows: [
              ["TP-Link", "Advanced > NAT Forwarding > Virtual Servers > Add (older: Forwarding > Virtual Servers)", "192.168.0.1 or 192.168.1.1 / tplinkwifi.net"],
              ["Netgear (Nighthawk)", "ADVANCED > Advanced Setup > Port Forwarding/Triggering > select 'Port Forwarding' > Add Custom Service", "192.168.1.1 / routerlogin.net"],
              ["ASUS", "Advanced Settings > WAN > Virtual Server / Port Forwarding > enable > Add profile", "192.168.1.1 / router.asus.com"],
              ["Linksys (Smart Wi-Fi)", "Security > Apps and Gaming > Single Port Forwarding > Add a new entry", "192.168.1.1 / LinksysSmartWiFi.com"],
              ["D-Link", "Advanced > Virtual Server (or Advanced Setup > NAT > Virtual Server)", "192.168.0.1 / 192.168.1.1"],
              ["Xfinity / Comcast", "Xfinity app > WiFi > View WiFi equipment > Advanced settings > Port forwarding > Add (browser admin at 10.0.0.1 does NOT offer it)", "Xfinity app (preferred)"],
              ["AT&T (BGW320/BGW210)", "Browser admin > Firewall > NAT/Gaming > add a Custom Service (needs the Device Access Code on the gateway sticker)", "192.168.1.254"],
              ["Spectrum", "My Spectrum app > Services > Router > Advanced Settings > Port Forwarding & IP Reservations > Add", "My Spectrum app"],
              ["Google Nest WiFi", "Google Home app > Wi-Fi settings > Advanced Networking > Port management > Add (requires Nest Wifi cloud services)", "Google Home app"],
            ],
          },
        ],
      },
      {
        heading: "Step 5 — Open the OS firewall on the node machine",
        blocks: [
          {
            type: "prose",
            text: "The router now sends inbound TCP 30303 to your machine, but the machine's own firewall may still drop it. Allow it. Run the command for your OS in an elevated/admin or sudo shell.",
          },
          {
            type: "commands",
            items: [
              { label: "Windows (Defender Firewall)", code: 'netsh advfirewall firewall add rule name="PYRAX p2p" dir=in action=allow protocol=TCP localport=30303', note: 'Run in an Administrator PowerShell or Command Prompt. To remove later: netsh advfirewall firewall delete rule name="PYRAX p2p"' },
              { label: "macOS", code: "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/PYRAX.app\nsudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /Applications/PYRAX.app", note: "macOS's firewall is per-APP, not per-port. Confirm the exact app name with: ls /Applications | grep -i pyrax. Confirm the firewall is even on with: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate (if it's off, no action is needed). macOS may also auto-prompt to allow incoming connections on first launch — clicking Allow does the same thing." },
              { label: "Linux (ufw — Ubuntu/Debian)", code: "sudo ufw allow 30303/tcp\nsudo ufw reload", note: "Check status with: sudo ufw status. Only TCP — do not add 30303/udp." },
              { label: "Linux (firewalld — Fedora/RHEL)", code: "sudo firewall-cmd --permanent --add-port=30303/tcp\nsudo firewall-cmd --reload", note: "Verify with: sudo firewall-cmd --list-ports" },
            ],
          },
        ],
      },
      {
        heading: "Step 6 — Test that you're reachable",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Make sure the node is running", body: "The node must be actively listening on TCP 30303 for the test to pass — a closed port may just mean the app isn't running, not that the forward is wrong. Start PYRAX first." },
              { title: "Use an open-port checker", body: "From any device, open an online 'open port check' tool, enter your PUBLIC IP (search 'what is my IP') and port 30303. A result of 'open' means the full path — router forward plus OS firewall — works." },
              { title: "Confirm in the app", body: "Check the desktop app's Peers tab. Once others can reach you, inbound connections appear there; reachable peers show their country flag (loopback/LAN shows a globe)." },
              { title: "If it shows closed", body: "Re-check: node running? Forward points at the correct (pinned) LAN IP? Protocol set to TCP? OS firewall rule added? Some routers need a reboot to apply. If everything looks right but it's still closed, suspect CGNAT (next section)." },
            ],
          },
        ],
      },
      {
        heading: "The CGNAT caveat + alternatives",
        blocks: [
          {
            type: "callout",
            tone: "warn",
            text: "CGNAT can make port forwarding impossible. Many home and most mobile ISPs put customers behind Carrier-Grade NAT, sharing one public IP across many subscribers. In that case NO router port-forward rule will make you reachable from the internet — the public IP isn't yours to forward. Quick check: compare the WAN IP in your router's status page with the public IP from 'what is my IP'. If they differ (or your router WAN IP is in 100.64.0.0/10), you're likely behind CGNAT.",
          },
          {
            type: "prose",
            text: "Good news: your node still works behind CGNAT for OUTBOUND connections. It dials reachable peers, syncs the chain, and announces itself — you just can't accept inbound dials. If you specifically want to be reachable, use one of these:",
          },
          {
            type: "list",
            items: [
              { text: "VPS / cloud node: run PYRAX on a small cloud server with a real public IP and open TCP 30303 in the provider's security group + the server's firewall. The simplest reliable path to reachability." },
              { text: "VPN with a public endpoint: a VPN that gives you a dedicated public IP and supports inbound port forwarding can route TCP 30303 to your home node." },
              { text: "Do nothing: rely on outbound connections to reachable peers. Your node stays fully in sync; it just won't accept inbound dials." },
              { text: "Ask your ISP: some will move you off CGNAT or assign a static/public IP, sometimes for a small fee." },
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "Security: open only TCP 30303 and nothing else. Don't enable a 'DMZ' or disable your firewall to make this work — that exposes every port on the machine. The directory is convenience discovery only; it never signs or validates chain data, and the relay key shown there is reference-only — you never paste it anywhere.",
          },
        ],
      },
      {
        heading: "Manual peering fallback",
        blocks: [
          {
            type: "prose",
            text: "If automatic discovery isn't connecting you to a specific node, you can dial it directly without any port forwarding (this is outbound). In the desktop app's Connect tab, paste the peer's Dial multiaddr into 'Peers to dial' (one per line) and click Apply — the node restarts and dials it.",
          },
          {
            type: "list",
            items: [
              { text: "Format: /ip4/203.0.113.7/tcp/30303/p2p/12D3KooW…  (one multiaddr per line)." },
              { text: "The port in the multiaddr is whatever that peer listens on — a public node shows /tcp/30303; an internal dev seed node shows /tcp/30310. Use exactly what's shown." },
              { text: "The relay key shown in the directory is reference-only and is NOT entered anywhere." },
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "troubleshooting",
    title: "No peers / won't sync",
    eyebrow: "Troubleshooting",
    icon: "🩺",
    summary: "An ordered checklist for a node that shows no peers or isn't syncing.",
    sections: [
      {
        heading: "Start here",
        blocks: [
          {
            type: "prose",
            text: "Most \"no peers\" reports are not broken nodes — they're a node that's still warming up, pointed at the wrong network, or behind a router that won't accept inbound connections. Work down this list in order. Each step is quick to check, and you can stop the moment your Peers tab starts filling in.",
          },
          {
            type: "callout",
            tone: "tip",
            text: "Good news first: a node behind NAT still works for OUTBOUND connections. You can dial reachable peers and sync the chain even if nobody on the internet can dial you. Being reachable is a bonus for the network — it is not required for you to sync.",
          },
        ],
      },
      {
        heading: "1. Wrong or disabled network selected (most common)",
        blocks: [
          {
            type: "prose",
            text: "Before anything else, confirm the node is actually pointed at the network you think it is. A node on a different network ID will never find peers — everything is technically fine, it's just looking in the wrong room.",
          },
          {
            type: "steps",
            items: [
              { title: "Open the network selector", body: "In the app, check which network the node is set to run on and that the node is enabled (not paused/stopped)." },
              { title: "Confirm it matches your peers", body: "Everyone you want to sync with must be on the same network. If you switched networks recently, the node may still be on the old one." },
              { title: "Confirm the node is running", body: "A disabled or stopped node listens for nothing. Make sure it's started, then watch the Sync tab for activity." },
            ],
          },
        ],
      },
      {
        heading: "2. It's still starting up — give it a minute",
        blocks: [
          {
            type: "prose",
            text: "Discovery is automatic but not instant. After launch the node has to come up, announce itself to the directory, read the list of live peers, and dial out to them. On a fresh start this commonly takes 30–90 seconds before the first peer appears.",
          },
          {
            type: "callout",
            tone: "info",
            text: "A peer is shown \"online\" only while it heartbeats (about a 30s TTL) and vanishes when it stops. So the list naturally takes a little time to populate and will fluctuate slightly as peers come and go. Let it settle before assuming something is wrong.",
          },
        ],
      },
      {
        heading: "3. Firewall / NAT blocking inbound connections",
        blocks: [
          {
            type: "prose",
            text: "If you want OTHER nodes to be able to reach you (and to help the network), inbound connections must get through. A PYRAX node listens for inbound peers on TCP port 30303 by default. It does NOT need inbound UDP — QUIC is used only for dialing OUT. So the rule is simple: forward TCP 30303 to the machine running the node, and allow it through the OS firewall. See the Port forwarding guide for exact steps and a per-router table.",
          },
          {
            type: "callout",
            tone: "info",
            text: "Advanced operators who changed the listen port with the node's --p2p-port flag must forward THAT port instead of 30303. Public desktop-app users should leave it at 30303.",
          },
        ],
      },
      {
        heading: "4. You're behind CGNAT (port forwarding won't help)",
        blocks: [
          {
            type: "prose",
            text: "If you forwarded TCP 30303 correctly and still can't accept inbound connections, you may be behind Carrier-Grade NAT (CGNAT). Many home and mobile ISPs share one public IP across many customers, so your router's port-forward rule never sees the inbound connection — the carrier dropped it upstream.",
          },
          {
            type: "steps",
            items: [
              { title: "Check your public IP", body: "Compare the WAN/IP your router shows against the public IP a 'what is my IP' service reports. If they differ — especially if your router's WAN IP is in 100.64.0.0/10 — you're almost certainly behind CGNAT." },
              { title: "Pick a reachable home instead", body: "Run the node on a VPS/cloud host with a real public IP, OR use a VPN that gives you a public inbound endpoint, OR simply rely on outbound connections to reachable peers." },
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "No amount of router configuration makes you inbound-reachable when the carrier is doing the NAT. That's expected, not a bug. Your node still syncs fine over OUTBOUND connections — you just won't be dialable until you move to a publicly reachable host or VPN endpoint.",
          },
        ],
      },
      {
        heading: "5. Directory unreachable — fall back to mDNS + manual peers",
        blocks: [
          {
            type: "prose",
            text: "Across the internet, the app announces your node to the directory and continuously dials the live nodes it lists. If the directory is unreachable from your network (corporate proxy, DNS filtering, an outage), automatic internet discovery stalls. Two fallbacks keep you connected.",
          },
          {
            type: "list",
            items: [
              { text: "On a LAN or VPN, nodes find each other automatically via mDNS with no configuration — peers on the same local network/VPN appear even if the directory is down." },
              { text: "Across the internet, add peers by hand in the Connect tab (see Connect manually). This bypasses the directory entirely — you dial the peer directly." },
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "The directory is convenience discovery ONLY. It never signs or validates chain data — nodes verify each other peer-to-peer. So if it's unreachable you lose easy discovery, not security: manually dialed peers are just as safe because verification happens directly between nodes.",
          },
        ],
      },
      {
        heading: "6. Clock skew",
        blocks: [
          {
            type: "prose",
            text: "A machine whose clock is off can fail handshakes and reject otherwise-valid data, which can look like \"won't sync.\" Make sure the node machine's time is correct and synced via NTP.",
          },
          {
            type: "commands",
            items: [
              { label: "Windows (PowerShell, admin)", code: "w32tm /resync", note: "Forces an immediate time resync. Check status with: w32tm /query /status" },
              { label: "macOS", code: "sudo sntp -sS time.apple.com", note: "Or enable Settings → General → Date & Time → Set automatically." },
              { label: "Linux (systemd)", code: "sudo timedatectl set-ntp true", note: "Verify with: timedatectl status (look for \"System clock synchronized: yes\")." },
            ],
          },
        ],
      },
      {
        heading: "7. Brand-new network with no reachable peers yet",
        blocks: [
          {
            type: "prose",
            text: "If you just created a new network, there may genuinely be nobody else online yet. There's nothing to discover and nothing to sync from — this isn't a fault, it's an empty room. The first node simply waits for a second.",
          },
          {
            type: "steps",
            items: [
              { title: "Bring up a second node", body: "Start another node on the same network. On the same LAN/VPN they'll find each other via mDNS automatically." },
              { title: "Or connect them manually", body: "If they're across the internet, dial one from the other using the Connect tab." },
              { title: "Confirm two-way sync", body: "Once both are up, watch each Sync tab advance to the same height." },
            ],
          },
        ],
      },
      {
        heading: "Reading the Peers, Connect, and Sync tabs",
        blocks: [
          {
            type: "table",
            columns: ["Tab", "What it tells you", "What to look for"],
            rows: [
              ["Peers", "Who you're currently connected to", "A list with entries means you have live peers. A flag = that peer's public IP geolocated; a globe = loopback/LAN peer."],
              ["Connect", "Manual peering controls", "The \"Peers to dial\" box where you paste multiaddrs to dial specific peers, plus Apply."],
              ["Sync", "Chain progress", "Your height climbing toward the network's height. Movement here is the real proof you're syncing."],
            ],
          },
        ],
      },
      {
        heading: "How to confirm you ARE connected",
        blocks: [
          {
            type: "list",
            items: [
              { text: "Peers tab shows one or more live entries — and they persist rather than appearing for a second and vanishing." },
              { text: "Sync tab shows your block height climbing toward (and eventually matching) the network's height." },
              { text: "Remember: peers heartbeat on roughly a 30s TTL, so a healthy list refreshes itself — a peer dropping off and a new one appearing is normal churn, not a failure." },
            ],
          },
        ],
      },
      {
        heading: "Still stuck?",
        blocks: [
          {
            type: "list",
            items: [
              { text: "Re-confirm the basics: right network selected, node running, and you've genuinely waited 60–90 seconds since start." },
              { text: "Try a manual dial in the Connect tab against a peer you KNOW is online — if that connects, the issue was discovery/directory, not your node." },
              { text: "If only inbound is failing, suspect CGNAT (Step 4) and move to a VPS or VPN endpoint rather than fighting the router." },
              { text: "Double-check clock sync and the local OS firewall on the node machine." },
              { text: "Collect specifics before asking for help: which network, how long it's been running, what the Peers/Sync tabs show, your public-vs-router IP (for CGNAT), and whether a manual dial worked." },
            ],
          },
        ],
      },
    ],
  },

  {
    slug: "how-it-works",
    title: "How the directory works",
    eyebrow: "About",
    icon: "📡",
    summary: "A live, self-cleaning presence list — convenience discovery, never consensus.",
    sections: [
      {
        heading: "What the directory is",
        blocks: [
          {
            type: "prose",
            text: "The peer directory is a live, self-cleaning presence list — one per network. It is a phone book of nodes that are reachable right now, not a record of who has ever existed. When your node is up, the PYRAX app announces it; the entry stays visible only while the node keeps checking in, then disappears on its own.",
          },
          {
            type: "list",
            items: [
              { text: "Per-network: each network has its own list; entries are not mixed across networks." },
              { text: "Live: it shows current presence, not history. Nothing is archived." },
              { text: "Self-cleaning: a peer is shown online only while it heartbeats (a ~30s TTL) and vanishes when it stops." },
              { text: "Convenience only: it speeds up finding peers. It is not part of the protocol that decides what is true on-chain." },
            ],
          },
        ],
      },
      {
        heading: "Discovery is bootstrapless",
        blocks: [
          {
            type: "prose",
            text: "You do not configure seed nodes or paste anything to get connected. Discovery is automatic and uses three independent paths, so no single one is a hard dependency.",
          },
          {
            type: "steps",
            items: [
              { title: "mDNS (local)", body: "On a LAN or VPN, nodes find each other automatically over multicast DNS. No config, no internet required." },
              { title: "The directory (internet)", body: "Across the internet, the app announces your node to the directory and continuously dials the other live nodes it lists. This is the convenience layer." },
              { title: "DHT (distributed)", body: "A distributed hash table lets nodes discover peers without depending on any central list. If the directory were unavailable, peer discovery still proceeds." },
            ],
          },
        ],
      },
      {
        heading: "Security model",
        blocks: [
          {
            type: "prose",
            text: "The directory is locked down on both sides — who may write to it, and who may read it. The design assumption is that the directory could be wrong or hostile and the network must still be safe; that is why announcing is tightly controlled and reads are throttled.",
          },
          {
            type: "table",
            columns: ["Surface", "Protection", "What it means"],
            rows: [
              ["Announcing (write)", "App-only + HMAC-authenticated + replay-protected", "Only the PYRAX apps can announce. Each announcement is HMAC-signed and replay-protected, so captured messages can't be re-sent to forge or refresh a presence."],
              ["Reading (public view)", "Same-origin / HMAC + rate-limited + CORS-locked", "Reads are restricted to legitimate origins, throttled to prevent scraping/abuse, and locked by CORS so arbitrary websites can't pull the list."],
            ],
          },
          {
            type: "callout",
            tone: "warn",
            text: "Critical: the directory never signs or validates chain data and holds no keys. It is NOT consensus. Even a fully compromised directory cannot make your node accept invalid blocks or fake balances — nodes verify each other peer-to-peer, and the protocol decides truth, not the directory.",
          },
        ],
      },
      {
        heading: "What it deliberately does NOT do",
        blocks: [
          {
            type: "list",
            items: [
              { text: "Never signs or validates chain data — it has no opinion on blocks, transactions, or balances." },
              { text: "Holds no keys — it cannot sign anything on anyone's behalf." },
              { text: "Is not consensus and not an authority — it cannot vote, finalize, or override what nodes compute." },
              { text: "Does not decide who you connect to — it only suggests candidates; your node still authenticates and verifies each peer directly." },
              { text: "Keeps no history — it is a live presence list, not a log of past nodes." },
            ],
          },
        ],
      },
      {
        heading: "Privacy",
        blocks: [
          {
            type: "prose",
            text: "Be clear-eyed about this: to be dialable, a node must be reachable, which means its dial address (IP + port) is public by nature. This is true of any peer-to-peer node, not a quirk of PYRAX.",
          },
          {
            type: "list",
            items: [
              { text: "Your dial address/IP is public because it is what other nodes connect to. There is no way to be reachable and hidden at the same time." },
              { text: "The country flag in the directory is geolocated from that public IP. Loopback/LAN addresses show a globe instead of a country." },
              { text: "You can run behind a VPN with a public endpoint — others then see the VPN's IP and location, not your home connection." },
            ],
          },
        ],
      },
      {
        heading: "The TTL / heartbeat presence model",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Heartbeat", body: "While running, the app re-announces your node on a short interval." },
              { title: "TTL window", body: "Each announcement carries a ~30s time-to-live. As long as a fresh heartbeat arrives within that window, you stay shown as online." },
              { title: "Auto-expiry", body: "Stop the node (crash, shutdown, network loss) and the heartbeats stop. Once the TTL lapses, the entry vanishes on its own — no stale ghosts." },
            ],
          },
        ],
      },
      {
        heading: "FAQ",
        blocks: [
          {
            type: "list",
            items: [
              { text: "If the directory went down, would the network stop? — No. It's convenience discovery only. mDNS handles local peers, the DHT discovers peers without any central list, and nodes keep dialing peers they already know. The directory just makes finding internet peers faster." },
              { text: "Could a hacked directory feed my node bad data or fake balances? — No. It never signs or validates chain data and holds no keys. The worst it could do is suggest a bad peer — and your node still authenticates and verifies every peer, rejecting anything invalid. The protocol decides truth, not the directory." },
              { text: "Can anyone post a fake node or spoof my entry? — Announcing is app-only, HMAC-authenticated, and replay-protected, so entries come only from genuine PYRAX apps and captured announcements can't be re-sent. The public read view is also rate-limited and CORS-locked." },
              { text: "Why is my IP and country shown? Can I hide it? — To be dialable you must be reachable, so your dial address (IP + port) is public by nature. The flag is geolocated from that IP. Run behind a VPN with a public endpoint to show the VPN's location instead; loopback/LAN shows a globe." },
              { text: "Why did my node disappear from the list? — Presence is a ~30s heartbeat. When your node stops (shutdown, crash, lost connection) the heartbeats stop and the entry expires on its own. A disappearance just means no fresh heartbeat arrived in time." },
            ],
          },
        ],
      },
    ],
  },
];
