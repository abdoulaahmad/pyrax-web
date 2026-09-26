// SPDX-License-Identifier: LicenseRef-Proprietary
// Industry content for the "energy-sustainability" category (10 business types). Filled by content pass.
import type { CategoryContent } from "./types";

export const content: CategoryContent = {
  "power-utilities": {
    overview:
      "Power utilities generate, transmit, and distribute electricity across regulated grids, but still reconcile meter reads, settlements, and wholesale purchases across siloed systems on monthly cycles. PYRAX turns every smart meter into an attested, real-time settlement endpoint - GhostDAG's 500k-TPS ceiling and machine-to-machine micro-payments let utilities meter, bill, and settle usage per-interval, while eth_getProof gives regulators tamper-proof access to emissions and consumption data.",
    marketSize: "$2.5T (2024)",
    projection: "$4.1T by 2030 · ~8.6% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global electricity market", value: "$2.5T" },
      { label: "Annual global generation", value: "29,500 TWh" },
      { label: "Smart meters deployed", value: "1.3B+" },
      { label: "T&D losses worldwide", value: "~8%" },
    ],
    painPoints: [
      "Meter-to-cash cycles run monthly, so revenue, losses, and theft are only visible weeks after the fact.",
      "Wholesale and retail settlement data lives in fragmented systems that never reconcile in real time.",
      "Non-technical losses and meter tampering drain billions with no cryptographic audit trail.",
      "Regulators demand emissions and reliability disclosures that utilities cannot prove tamper-free.",
    ],
    solutions: [
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Millions of smart meters post interval reads and settle usage in parallel, so metering, billing, and wholesale reconciliation happen continuously instead of on a monthly batch.",
      },
      {
        feature: "Machine-to-machine micro-payments",
        how: "Meters and devices pay per-kilowatt-hour in real time, enabling prepaid supply, sub-second load billing, and automatic settlement between generators, DSOs, and retailers with no invoicing lag.",
      },
      {
        feature: "IoT smart-meter attestation",
        how: "Each meter signs its readings with a hardware-attested key, so consumption data is provably authentic and tampering or non-technical loss is detectable on-chain.",
      },
      {
        feature: "eth_getProof verifiable data",
        how: "Regulators pull cryptographic proofs of consumption, generation mix, and emissions directly from state, so compliance and reliability reports cannot be quietly edited after the fact.",
      },
      {
        feature: "BLS instant finality",
        how: "Wholesale and interval settlements clear irreversibly within a block, removing the intraday exposure and end-of-day netting that regulated markets depend on today.",
      },
    ],
    dapps: [
      { name: "MeterMint", desc: "Attested smart-meter oracle that signs and posts interval reads on-chain so every kilowatt-hour is authenticated at the source.", tags: ["IoT", "eth_getProof"] },
      { name: "PrepaidWatt", desc: "Prepaid electricity contract where households top up and meters draw down per-second via M2M micro-payments, cutting off cleanly at zero.", tags: ["M2M", "EVM"] },
      { name: "LossHunter", desc: "Non-technical-loss detector that reconciles attested feeder and meter data to flag theft and tampering with a verifiable evidence trail.", tags: ["IoT", "PYRAX Compute"] },
      { name: "SettleGrid", desc: "Wholesale settlement rail that clears generator-to-retailer energy purchases with BLS instant finality, retiring monthly netting.", tags: ["Finality", "Escrow"] },
      { name: "OutageProof", desc: "Reliability-index registry that timestamps outages and restorations so SAIDI/SAIFI reports are provable to regulators.", tags: ["eth_getProof", "WASM"] },
      { name: "TariffChain", desc: "Programmable time-of-use tariff engine that applies transparent, on-chain pricing rules to every metered interval.", tags: ["EVM", "M2M"] },
      { name: "MixLedger", desc: "Real-time generation-mix ledger that proves the carbon intensity behind each delivered kilowatt-hour.", tags: ["eth_getProof", "Carbon"] },
      { name: "GridForecast", desc: "PYRAX Compute-backed demand forecaster whose load predictions ship with a verifiable-compute proof for grid planners.", tags: ["Compute", "Forecast"] },
    ],
  },

  "renewable-energy": {
    overview:
      "Renewable energy - solar, wind, hydro, and storage - is scaling faster than any generation class in history, but its green claims, subsidies, and RECs rely on trust in registries that double-count and settle slowly. PYRAX issues double-spend-proof tokenized RECs with on-chain provenance and retirement, meters generation in real time via attested inverters, and lets developers settle P2P energy sales with machine-to-machine micro-payments.",
    marketSize: "$1.1T (2024)",
    projection: "$2.4T by 2030 · ~13.9% CAGR",
    source: "Precedence Research, 2024",
    stats: [
      { label: "Renewable investment (2024)", value: "$728B" },
      { label: "Renewable capacity added", value: "560 GW/yr" },
      { label: "Global REC market", value: "$16.7B" },
      { label: "Share of new capacity", value: "~90%" },
    ],
    painPoints: [
      "Renewable Energy Certificates are double-counted across fragmented national registries.",
      "Generation attestation depends on manual reads that arrive weeks after production.",
      "Small and distributed generators cannot economically sell surplus peer-to-peer.",
      "Green claims and subsidy eligibility are hard to prove without a tamper-proof provenance trail.",
    ],
    solutions: [
      {
        feature: "Double-spend-proof tokenized RECs",
        how: "Each megawatt-hour mints a unique REC with on-chain provenance from generation to retirement, so a certificate can be sold, tracked, and permanently retired exactly once - never double-counted.",
      },
      {
        feature: "IoT inverter attestation",
        how: "Solar and wind inverters sign generation data at the source, so RECs are backed by cryptographically authentic production rather than self-reported totals.",
      },
      {
        feature: "Machine-to-machine micro-payments",
        how: "Rooftop and community generators sell surplus directly to neighbours, settling per-kilowatt-hour in real time with no aggregator taking a cut.",
      },
      {
        feature: "eth_getProof verifiable data",
        how: "Auditors and subsidy bodies pull tamper-proof proofs of generation and REC retirement, so green claims and grant eligibility hold up under scrutiny.",
      },
      {
        feature: "On-chain escrow and settlement",
        how: "Power-purchase agreements pay out automatically against attested generation, releasing funds to developers the moment delivery is proven.",
      },
    ],
    dapps: [
      { name: "RECForge", desc: "Mints double-spend-proof RECs from attested generation, tracking each certificate from issuance to retirement so it is counted once.", tags: ["Tokenized", "eth_getProof"] },
      { name: "SolarSplit", desc: "P2P surplus-solar marketplace where rooftops sell excess to neighbours via M2M micro-payments settled per-kilowatt-hour.", tags: ["M2M", "P2P"] },
      { name: "PPAutopay", desc: "Power-purchase-agreement escrow that releases payment to developers automatically against attested delivery.", tags: ["Escrow", "EVM"] },
      { name: "InverterProof", desc: "Attestation oracle that signs inverter output so generation totals behind RECs are verifiable.", tags: ["IoT", "eth_getProof"] },
      { name: "GreenClaim", desc: "Corporate green-claim registry proving 24/7 renewable matching with retired-REC provenance for auditors.", tags: ["Tokenized", "ESG"] },
      { name: "StorageArb", desc: "Battery-dispatch contract that buys and sells stored energy against live price signals with instant settlement.", tags: ["EVM", "M2M"] },
      { name: "CommunitySun", desc: "Community-solar shareholding dApp that streams pro-rata generation revenue to token-holding subscribers.", tags: ["Tokenized", "WASM"] },
      { name: "SubsidyTrack", desc: "Feed-in-tariff and subsidy tracker that pays incentives against tamper-proof, attested production data.", tags: ["Escrow", "eth_getProof"] },
    ],
  },

  "carbon-markets": {
    overview:
      "Carbon markets - compliance ETS and voluntary offsets - are meant to price emissions, but the voluntary side is plagued by phantom credits, double-issuance, and opaque retirement. PYRAX makes each credit a double-spend-proof tokenized asset with cradle-to-retirement provenance, so a tonne of CO2 is issued, traded, and retired exactly once, with eth_getProof giving verifiers tamper-proof access to the underlying MRV data.",
    marketSize: "$949B (2024)",
    projection: "$4.7T by 2030 · ~30.6% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Global carbon market value", value: "$949B" },
      { label: "Compliance market share", value: "~98%" },
      { label: "Voluntary carbon market", value: "$1.4B" },
      { label: "Credits at double-count risk", value: "up to 30%" },
    ],
    painPoints: [
      "Voluntary credits are double-issued and double-retired across disconnected registries.",
      "Buyers cannot verify the MRV data behind a credit without trusting the registry.",
      "Retirement is opaque, so the same tonne can be claimed by multiple parties.",
      "Trading positions are exposed, discouraging institutional participation.",
    ],
    solutions: [
      {
        feature: "Double-spend-proof tokenized credits",
        how: "Each verified tonne mints one credit with full provenance; retirement burns it irreversibly, so no offset can be counted, sold, or claimed twice across any registry.",
      },
      {
        feature: "eth_getProof verifiable MRV data",
        how: "The measurement, reporting, and verification data behind every credit is anchored on-chain, so buyers and standards bodies can prove authenticity without trusting a central registry.",
      },
      {
        feature: "Shielded transfers with viewing keys",
        how: "Institutions trade carbon positions with amounts hidden from competitors, while regulators and standards bodies hold viewing keys for full oversight.",
      },
      {
        feature: "On-chain escrow and settlement",
        how: "Forward carbon purchases lock funds in escrow and release against verified issuance, removing counterparty and delivery risk from long-dated offset deals.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Satellite and sensor-based MRV models run with cryptographic proofs, so a forest-carbon or soil-carbon estimate is reproducible and defensible to a verifier.",
      },
    ],
    dapps: [
      { name: "TonneOnce", desc: "Registry that mints one double-spend-proof credit per verified tonne and burns it on retirement so it can never be claimed twice.", tags: ["Tokenized", "Carbon"] },
      { name: "MRVProof", desc: "Anchors satellite and sensor MRV data on-chain so the science behind each credit is verifiable to buyers.", tags: ["eth_getProof", "PYRAX Compute"] },
      { name: "ShieldTrade", desc: "Shielded carbon exchange where institutional positions stay private but regulators hold viewing keys.", tags: ["Shielded", "ViewingKey"] },
      { name: "ForwardCO2", desc: "Forward-offset escrow that releases payment to project developers only against verified, retired issuance.", tags: ["Escrow", "EVM"] },
      { name: "RetireProof", desc: "Public retirement ledger giving corporates a tamper-proof claim to the exact credits they have retired.", tags: ["Carbon", "eth_getProof"] },
      { name: "NatureVault", desc: "Nature-based-project tokenizer that streams issuance to landowners as verified sequestration is proven over time.", tags: ["Tokenized", "PYRAX Compute"] },
      { name: "DoubleGuard", desc: "Cross-registry corresponding-adjustment tracker that blocks the same tonne from being sold in two jurisdictions.", tags: ["Carbon", "WASM"] },
      { name: "ScopeOffset", desc: "Auto-retirement contract that matches a company's attested emissions to credits and retires them on a schedule.", tags: ["ESG", "Escrow"] },
    ],
  },

  "oil-gas": {
    overview:
      "Oil and gas remains the largest energy sector by revenue, but its trading, custody transfers, and emissions reporting run on paper confirmations and self-declared figures that regulators increasingly distrust. PYRAX settles physical and financial trades with on-chain escrow and instant finality, attests custody transfers and flare data from field sensors, and gives auditors eth_getProof access to tamper-proof methane and Scope-1 emissions records.",
    marketSize: "$4.3T (2024)",
    projection: "$5.6T by 2030 · ~4.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global oil & gas revenue", value: "$4.3T" },
      { label: "Daily crude demand", value: "~103M bbl" },
      { label: "Methane emissions (energy)", value: "~120 Mt/yr" },
      { label: "Physical trade volume", value: "$2T+/yr" },
    ],
    painPoints: [
      "Physical trades settle on paper confirmations with days of counterparty and delivery risk.",
      "Custody transfers and volumes are reconciled manually across trader, transporter, and buyer systems.",
      "Methane and flare emissions are self-reported and impossible for regulators to independently verify.",
      "Trading positions leak to the market through intermediaries and disclosure delays.",
    ],
    solutions: [
      {
        feature: "On-chain escrow and settlement",
        how: "Cargoes and financial legs settle atomically against attested delivery documents, so payment and title transfer together and letters of credit clear without multi-day float.",
      },
      {
        feature: "IoT field-sensor attestation",
        how: "Custody meters, flare stacks, and methane sensors sign their readings on-chain, so volumes and emissions come from authenticated hardware rather than manual logs.",
      },
      {
        feature: "eth_getProof verifiable emissions data",
        how: "Regulators and buyers pull tamper-proof proofs of methane intensity and Scope-1 emissions, supporting differentiated 'responsibly-sourced gas' premiums.",
      },
      {
        feature: "Shielded transfers with viewing keys",
        how: "Traders keep positions and counterparties confidential from the market while compliance desks and regulators inspect flows through scoped viewing keys.",
      },
      {
        feature: "BLS instant finality",
        how: "Commodity and derivative settlements finalize irreversibly within a block, removing intraday exposure between trading counterparties on the rail.",
      },
    ],
    dapps: [
      { name: "CargoClear", desc: "Atomic crude-and-product settlement that swaps title for payment against attested bills of lading with instant finality.", tags: ["Escrow", "Finality"] },
      { name: "MethaneProof", desc: "Field-sensor oracle that signs flare and methane data on-chain so emissions intensity is independently verifiable.", tags: ["IoT", "eth_getProof"] },
      { name: "CustodyChain", desc: "Custody-transfer ledger that reconciles meter volumes across trader, pipeline, and buyer with a single attested record.", tags: ["IoT", "WASM"] },
      { name: "RSGmark", desc: "Responsibly-sourced-gas certificate that ties a molecule's carbon intensity to a verifiable, tradable attestation.", tags: ["Tokenized", "eth_getProof"] },
      { name: "DarkDesk", desc: "Shielded commodity trading venue where positions stay private but regulators hold viewing keys for surveillance.", tags: ["Shielded", "ViewingKey"] },
      { name: "LCatomic", desc: "Digital letter-of-credit escrow that releases funds against signed shipping and inspection documents.", tags: ["Escrow", "EVM"] },
      { name: "FlareBurn", desc: "Flare-reduction incentive contract that pays operators against attested reductions in flared volume.", tags: ["IoT", "Carbon"] },
      { name: "SwapSettle", desc: "Cleared derivatives settlement for energy swaps and futures with block-level BLS finality.", tags: ["Finality", "EVM"] },
    ],
  },

  "ev-charging": {
    overview:
      "EV charging is scaling from a niche into critical infrastructure, but roaming across networks still means fragmented apps, clearing-house delays, and disputed sessions. PYRAX lets a charger and a car settle a session directly with machine-to-machine micro-payments and cross-network roaming, meters energy per-second, and proves the renewable provenance of each charge with double-spend-proof green attestations.",
    marketSize: "$28.5B (2024)",
    projection: "$140B by 2030 · ~30.3% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Global EV charging market", value: "$28.5B" },
      { label: "Public chargers installed", value: "4M+" },
      { label: "EVs on the road", value: "45M+" },
      { label: "Roaming clearing delay", value: "days" },
    ],
    painPoints: [
      "Roaming across charging networks depends on slow clearing houses and reconciliation fees.",
      "Drivers juggle dozens of apps and accounts instead of paying any charger directly.",
      "Session disputes over delivered energy have no shared, trusted record.",
      "Green-charging claims cannot be tied to verifiable renewable supply.",
    ],
    solutions: [
      {
        feature: "Machine-to-machine micro-payments",
        how: "The vehicle pays the charger directly per-second of delivered energy, so a driver can plug into any station and settle instantly without an account on that network.",
      },
      {
        feature: "Cross-network EV roaming",
        how: "GhostDAG's 500k-TPS throughput lets sessions from every operator settle peer-to-peer in real time, retiring the roaming clearing house and its fees and delays.",
      },
      {
        feature: "IoT charger attestation",
        how: "Each charge point signs delivered-energy and session data, giving drivers and operators a shared, tamper-proof session record that ends disputes.",
      },
      {
        feature: "Double-spend-proof green attestations",
        how: "A session can be matched to a retired REC, so a 'charged on 100% renewables' claim is backed by a provably single-use certificate.",
      },
      {
        feature: "On-chain escrow and settlement",
        how: "Fleet and subscription charging pre-fund escrow that draws down per-session, giving operators guaranteed payment and fleets a single reconciled statement.",
      },
    ],
    dapps: [
      { name: "PlugPay", desc: "Plug-and-charge wallet where the car pays any charger per-second via M2M micro-payments with no network account.", tags: ["M2M", "IoT"] },
      { name: "RoamGrid", desc: "Cross-network roaming settlement that clears sessions between operators peer-to-peer, retiring the clearing house.", tags: ["M2M", "Finality"] },
      { name: "SessionProof", desc: "Attested charging-session ledger that records delivered energy so disputes resolve against a shared record.", tags: ["IoT", "eth_getProof"] },
      { name: "GreenCharge", desc: "Renewable-charging certifier that matches each session to a retired REC for verifiable green claims.", tags: ["Tokenized", "Carbon"] },
      { name: "FleetFuel", desc: "Fleet charging escrow that pre-funds and draws per-session, delivering one reconciled statement across all networks.", tags: ["Escrow", "EVM"] },
      { name: "V2Gmarket", desc: "Vehicle-to-grid marketplace where parked EVs sell stored energy back to the grid via micro-payments.", tags: ["M2M", "Grid"] },
      { name: "PriceBeacon", desc: "Dynamic charging-tariff contract that streams live per-station pricing and applies it transparently per session.", tags: ["EVM", "M2M"] },
      { name: "ChargeForecast", desc: "PYRAX Compute charger-utilization forecaster with verifiable-compute proofs for siting and load planning.", tags: ["Compute", "Forecast"] },
    ],
  },

  "grid-management": {
    overview:
      "Grid management balances supply and demand across increasingly decentralized, renewable-heavy networks, coordinating millions of distributed resources in real time. PYRAX gives grid operators a coordination layer where demand-response signals, DER dispatch, and settlement clear with machine-to-machine micro-payments and BLS instant finality, backed by PYRAX Compute forecasts that ship with verifiable-compute proofs.",
    marketSize: "$7.5B (2024)",
    projection: "$24B by 2030 · ~21.4% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Smart-grid management market", value: "$7.5B" },
      { label: "Distributed resources online", value: "500 GW+" },
      { label: "Demand-response potential", value: "200 GW" },
      { label: "Grid-balancing spend/yr", value: "$10B+" },
    ],
    painPoints: [
      "Distributed energy resources are dispatched through slow, centralized SCADA loops.",
      "Demand-response events are settled after the fact with disputed baselines and delayed payment.",
      "Operators cannot verify that a resource actually delivered the flexibility it was paid for.",
      "Load and generation forecasts are opaque black boxes that operators must take on faith.",
    ],
    solutions: [
      {
        feature: "Demand-response coordination",
        how: "Flexibility signals fan out to millions of devices and settle per-event, so a thermostat, battery, or factory that curtails load is paid automatically against attested delivery.",
      },
      {
        feature: "Machine-to-machine micro-payments",
        how: "DERs bid, dispatch, and get paid per-kilowatt of flexibility in real time, turning fleets of batteries, EVs, and appliances into a coordinated virtual power plant.",
      },
      {
        feature: "IoT device attestation",
        how: "Each responding asset signs its metered response, so operators verify delivered flexibility cryptographically instead of trusting estimated baselines.",
      },
      {
        feature: "PYRAX Compute verifiable forecasting",
        how: "Load, generation, and congestion forecasts run with cryptographic proofs, so an operator can audit exactly why the model dispatched a resource.",
      },
      {
        feature: "BLS instant finality",
        how: "Balancing and ancillary-service settlements finalize within a block, matching the sub-second cadence real-time grid operations require.",
      },
    ],
    dapps: [
      { name: "FlexMarket", desc: "Demand-response market where DERs bid flexibility and get paid per-event against attested, metered delivery.", tags: ["DemandResponse", "M2M"] },
      { name: "VPPconductor", desc: "Virtual-power-plant orchestrator that dispatches thousands of batteries and EVs and settles them in real time.", tags: ["M2M", "Grid"] },
      { name: "BaselineProof", desc: "Attested-baseline oracle that records device response so demand-response payments settle without dispute.", tags: ["IoT", "eth_getProof"] },
      { name: "CongestionCast", desc: "PYRAX Compute congestion forecaster whose predictions carry verifiable-compute proofs for dispatch decisions.", tags: ["Compute", "Forecast"] },
      { name: "FreqGuard", desc: "Frequency-response contract that pays fast batteries for sub-second grid stabilization with instant finality.", tags: ["Finality", "M2M"] },
      { name: "DERegister", desc: "Distributed-resource registry attesting each asset's capacity and location for market participation.", tags: ["IoT", "WASM"] },
      { name: "PeakShave", desc: "Automated peak-shaving contract that curtails and rewards enrolled loads during system peaks.", tags: ["DemandResponse", "EVM"] },
      { name: "LMPstream", desc: "Locational-marginal-price feed that streams verifiable nodal prices for DER dispatch and hedging.", tags: ["eth_getProof", "Grid"] },
    ],
  },

  "water-utilities": {
    overview:
      "Water utilities supply and treat water for billions, but leakage, non-revenue water, and manual meter reads leave a third of supply unaccounted-for in many networks. PYRAX turns smart water meters into attested, real-time endpoints - metering and billing per-liter with machine-to-machine micro-payments - while eth_getProof gives regulators tamper-proof quality and consumption records.",
    marketSize: "$323B (2024)",
    projection: "$536B by 2030 · ~8.8% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global water & wastewater market", value: "$323B" },
      { label: "Non-revenue water", value: "~30%" },
      { label: "Smart water meters", value: "180M+" },
      { label: "People lacking safe water", value: "2.2B" },
    ],
    painPoints: [
      "Up to a third of supplied water is lost or unbilled with no real-time visibility.",
      "Manual and monthly meter reads hide leaks and theft until reconciliation.",
      "Water-quality reporting is self-declared and hard for regulators to verify.",
      "Small and rural systems lack affordable, auditable billing infrastructure.",
    ],
    solutions: [
      {
        feature: "IoT water-meter attestation",
        how: "Smart meters and district sensors sign flow and quality readings, so leaks, theft, and contamination are detectable in real time from authenticated data.",
      },
      {
        feature: "Machine-to-machine micro-payments",
        how: "Meters bill per-liter continuously, enabling prepaid water, pay-as-you-go kiosks, and instant reconciliation without monthly invoicing overhead.",
      },
      {
        feature: "eth_getProof verifiable quality data",
        how: "Regulators pull tamper-proof proofs of turbidity, chlorine, and contaminant levels, so drinking-water compliance is provable rather than declared.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "Millions of meter reads and micro-billings settle in parallel, giving even city-scale utilities continuous meter-to-cash visibility.",
      },
      {
        feature: "PYRAX Compute verifiable leak detection",
        how: "District-metered-area anomaly models run with verifiable proofs, so a flagged leak can be justified and prioritized with an auditable evidence trail.",
      },
    ],
    dapps: [
      { name: "FlowProof", desc: "Attested water-meter oracle that signs flow and quality reads so consumption and leaks are authenticated at the source.", tags: ["IoT", "eth_getProof"] },
      { name: "DropPay", desc: "Prepaid and pay-as-you-go water billing where meters draw down per-liter via M2M micro-payments.", tags: ["M2M", "EVM"] },
      { name: "LeakHunter", desc: "PYRAX Compute leak detector that reconciles district-meter data to localize losses with a verifiable evidence trail.", tags: ["Compute", "IoT"] },
      { name: "QualityLedger", desc: "Drinking-water-quality registry that anchors turbidity and contaminant reads for tamper-proof compliance.", tags: ["eth_getProof", "ESG"] },
      { name: "KioskWater", desc: "Community water-kiosk dApp letting rural users tap and pay for verified potable water instantly.", tags: ["M2M", "IoT"] },
      { name: "NRWtrack", desc: "Non-revenue-water dashboard reconciling attested input and billed volumes to quantify and target losses.", tags: ["IoT", "WASM"] },
      { name: "TariffTap", desc: "Block-tariff billing contract that applies transparent, on-chain conservation pricing per household.", tags: ["EVM", "M2M"] },
      { name: "WaterRights", desc: "Tokenized water-abstraction rights with double-spend-proof allocation and transparent trading.", tags: ["Tokenized", "eth_getProof"] },
    ],
  },

  "waste-recycling": {
    overview:
      "Waste and recycling is the physical backbone of the circular economy, but material chains are opaque, greenwashing is rampant, and recycled-content claims are unverifiable. PYRAX gives every material batch a double-spend-proof tokenized passport with provenance from bin to remanufacture, attests collection and sorting from smart-bin sensors, and pays deposit-return and pickup micro-payments machine-to-machine.",
    marketSize: "$367B (2024)",
    projection: "$542B by 2030 · ~6.7% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "Global waste management market", value: "$367B" },
      { label: "Municipal solid waste/yr", value: "2.3B tonnes" },
      { label: "Global recycling rate", value: "~19%" },
      { label: "Recycled-content fraud risk", value: "high" },
    ],
    painPoints: [
      "Material chains are opaque, so recycled-content and diversion claims cannot be verified.",
      "Deposit-return and pay-as-you-throw schemes are costly to administer and easy to game.",
      "Collection and sorting data is manual, hiding contamination and misrouting.",
      "Extended-producer-responsibility reporting is self-declared and hard to audit.",
    ],
    solutions: [
      {
        feature: "Double-spend-proof material passports",
        how: "Each batch of recovered material carries a tokenized passport tracing it from collection through sorting to remanufacture, so recycled-content claims are backed by unforgeable provenance.",
      },
      {
        feature: "IoT bin and sorter attestation",
        how: "Smart bins, weighbridges, and optical sorters sign their data, so diversion rates, contamination, and material grades are authenticated rather than estimated.",
      },
      {
        feature: "Machine-to-machine micro-payments",
        how: "Deposit-return and pay-as-you-throw schemes pay citizens per verified item or per kilo returned, and settle haulier pickups automatically per attested collection.",
      },
      {
        feature: "eth_getProof verifiable EPR data",
        how: "Producers and regulators pull tamper-proof proofs of collection and recycling volumes, turning extended-producer-responsibility reporting into provable fact.",
      },
      {
        feature: "On-chain escrow and settlement",
        how: "Recovered-material trades settle against attested weight and grade, releasing payment to recyclers the moment delivery is verified.",
      },
    ],
    dapps: [
      { name: "MatPassport", desc: "Double-spend-proof material passport tracing recovered material from bin to remanufacture for verifiable recycled content.", tags: ["Tokenized", "eth_getProof"] },
      { name: "DepositBack", desc: "Deposit-return scheme paying citizens per attested returned item via M2M micro-payments.", tags: ["M2M", "IoT"] },
      { name: "BinSense", desc: "Smart-bin oracle signing fill, weight, and contamination data so collection is optimized and authenticated.", tags: ["IoT", "PYRAX Compute"] },
      { name: "EPRproof", desc: "Extended-producer-responsibility ledger anchoring collection and recycling volumes for tamper-proof reporting.", tags: ["eth_getProof", "ESG"] },
      { name: "ScrapMarket", desc: "Recovered-material exchange that settles trades against attested weight and grade with automated escrow.", tags: ["Escrow", "Tokenized"] },
      { name: "PayThrow", desc: "Pay-as-you-throw billing that charges households per attested kilo of residual waste.", tags: ["M2M", "IoT"] },
      { name: "SortScore", desc: "PYRAX Compute sorting-quality model whose contamination scores carry verifiable-compute proofs.", tags: ["Compute", "WASM"] },
      { name: "CircularClaim", desc: "Circular-economy claim verifier that proves a product's recycled content from passport provenance.", tags: ["Tokenized", "ESG"] },
    ],
  },

  "energy-trading": {
    overview:
      "Energy trading moves trillions in power, gas, and derivatives, but bilateral deals settle through clearing houses and brokers with days of counterparty risk and leaked positions. PYRAX settles trades with on-chain escrow and BLS instant finality, keeps positions confidential through shielded transfers while regulators hold viewing keys, and handles peer-to-peer intraday trades at GhostDAG's 500k-TPS scale.",
    marketSize: "$4.8B (2024)",
    projection: "$12.1B by 2030 · ~16.6% CAGR",
    source: "MarketsandMarkets, 2024",
    stats: [
      { label: "Energy-trading software market", value: "$4.8B" },
      { label: "Global power trade volume", value: "$2.5T+/yr" },
      { label: "Intraday market growth", value: "double digit" },
      { label: "Settlement cycle today", value: "T+1 / T+2" },
    ],
    painPoints: [
      "Bilateral and cleared trades carry days of counterparty and settlement risk.",
      "Positions leak through brokers and delayed disclosure, moving the market against traders.",
      "Intraday and P2P energy trading is throttled by legacy settlement rails.",
      "Regulators struggle to surveil markets without forcing full position disclosure.",
    ],
    solutions: [
      {
        feature: "Shielded transfers with viewing keys",
        how: "Traders keep positions, volumes, and counterparties private from the market, while regulators and clearing bodies hold viewing keys for full, non-intrusive surveillance.",
      },
      {
        feature: "BLS instant finality",
        how: "Spot, forward, and derivative settlements finalize irreversibly within a block, collapsing T+1/T+2 into real time and eliminating intraday counterparty exposure.",
      },
      {
        feature: "On-chain escrow and settlement",
        how: "Trades lock collateral and payment in escrow and settle atomically on delivery, removing broker intermediation and default risk from bilateral deals.",
      },
      {
        feature: "GhostDAG (500k-TPS target)",
        how: "High-frequency intraday and peer-to-peer energy trades clear in parallel, supporting continuous 15-minute and sub-hourly markets without a throughput ceiling.",
      },
      {
        feature: "Multi-VM smart contracts (EVM / WASM / Cairo)",
        how: "Structured products, swaps, and auto-hedging strategies are coded as transparent, testable contracts rather than opaque bilateral confirmations.",
      },
    ],
    dapps: [
      { name: "DarkPower", desc: "Shielded energy exchange where positions stay private but regulators hold viewing keys for surveillance.", tags: ["Shielded", "ViewingKey"] },
      { name: "AtomicSwap", desc: "Physical-and-financial trade settlement that swaps delivery for payment atomically with instant finality.", tags: ["Escrow", "Finality"] },
      { name: "IntradayBook", desc: "Continuous 15-minute intraday market clearing peer-to-peer power trades at GhostDAG scale.", tags: ["M2M", "EVM"] },
      { name: "HedgeBot", desc: "Automated hedging contract that rolls positions against live price feeds with transparent, on-chain logic.", tags: ["EVM", "WASM"] },
      { name: "MarginVault", desc: "Collateral-and-margin escrow that marks positions to market and manages calls automatically.", tags: ["Escrow", "Finality"] },
      { name: "SurveilKey", desc: "Regulator surveillance console that reads shielded market flows through scoped viewing keys.", tags: ["ViewingKey", "Shielded"] },
      { name: "StructNote", desc: "Structured-product factory issuing swaps, caps, and collars as auditable multi-VM contracts.", tags: ["Cairo", "EVM"] },
      { name: "PriceForecast", desc: "PYRAX Compute price forecaster delivering verifiable-compute signals for trading and risk desks.", tags: ["Compute", "Forecast"] },
    ],
  },

  "esg-reporting": {
    overview:
      "ESG and sustainability reporting has become mandatory under CSRD, SEC, and ISSB rules, yet most disclosures rest on spreadsheets and self-declared figures that cannot be independently verified. PYRAX anchors emissions, energy, and social metrics on-chain with eth_getProof so every number is tamper-proof and audit-ready, while shielded data with auditor viewing keys keeps sensitive figures private until they are disclosed.",
    marketSize: "$1.4B (2024)",
    projection: "$4.3B by 2030 · ~20.5% CAGR",
    source: "Grand View Research, 2024",
    stats: [
      { label: "ESG reporting software market", value: "$1.4B" },
      { label: "Companies under CSRD", value: "50,000+" },
      { label: "Assurance market growth", value: "double digit" },
      { label: "Reports with unverifiable data", value: "majority" },
    ],
    painPoints: [
      "Emissions and ESG metrics are compiled in spreadsheets that auditors cannot trust or trace.",
      "Scope-3 supply-chain data is self-reported by suppliers with no verifiable source.",
      "Greenwashing risk grows as claims outpace provable, tamper-free evidence.",
      "Sensitive ESG data must stay private yet be disclosable to auditors and regulators on demand.",
    ],
    solutions: [
      {
        feature: "eth_getProof verifiable ESG data",
        how: "Emissions, energy, water, and social metrics are anchored on-chain, so every reported figure comes with a cryptographic proof that it was not altered after the fact.",
      },
      {
        feature: "Shielded data with viewing keys",
        how: "Sensitive ESG figures stay confidential on-chain, while auditors, assurers, and regulators receive scoped viewing keys for read-only verification without public exposure.",
      },
      {
        feature: "Double-spend-proof carbon and REC provenance",
        how: "Retired credits and RECs claimed in a report carry unforgeable provenance, so Scope-2 and offset claims cannot be double-counted across disclosures.",
      },
      {
        feature: "IoT source attestation",
        how: "Metrics flow from attested meters and sensors rather than manual entry, so Scope-1 and Scope-2 data is authentic from the point of measurement.",
      },
      {
        feature: "PYRAX Compute verifiable AI/compute",
        how: "Scope-3 and estimation models run with cryptographic proofs, so a supply-chain emissions estimate is reproducible and defensible under assurance.",
      },
    ],
    dapps: [
      { name: "ProofReport", desc: "ESG disclosure builder that anchors every metric on-chain with an eth_getProof audit trail for assurers.", tags: ["eth_getProof", "ESG"] },
      { name: "ScopeVault", desc: "Shielded emissions ledger keeping Scope-1/2/3 data private with scoped viewing keys for auditors.", tags: ["Shielded", "ViewingKey"] },
      { name: "Scope3Chain", desc: "Supplier data-sharing network passing attested Scope-3 metrics up the value chain verifiably.", tags: ["eth_getProof", "SupplyChain"] },
      { name: "GreenGuard", desc: "Greenwashing detector that cross-checks marketing claims against tamper-proof on-chain evidence.", tags: ["ESG", "PYRAX Compute"] },
      { name: "AssureKey", desc: "Assurance console giving external auditors read-only viewing-key access to shielded ESG records.", tags: ["ViewingKey", "Shielded"] },
      { name: "OffsetLedger", desc: "Report-linked retirement registry proving that claimed carbon credits were retired exactly once.", tags: ["Tokenized", "Carbon"] },
      { name: "TaxonomyTag", desc: "EU-Taxonomy alignment tagger anchoring activity classifications with verifiable evidence.", tags: ["WASM", "eth_getProof"] },
      { name: "MetricSense", desc: "PYRAX Compute Scope-3 estimator whose supply-chain emissions estimates carry verifiable-compute proofs.", tags: ["Compute", "Forecast"] },
    ],
  },
};

