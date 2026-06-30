// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Contract source verification: compile submitted Solidity with the EXACT solc version, strip the
// trailing CBOR metadata from both the compiled and the on-chain deployed bytecode, compare, and on a
// match store source + ABI. v1 = single-file source (flattened); multi-file/standard-json can follow.

import solc from "solc";
import * as db from "./db.js";
import { rpc } from "./rpc.js";
import { rpcFor } from "./config.js";

const loadCompiler = (version) =>
  new Promise((resolve, reject) => {
    const v = version.startsWith("v") ? version : "v" + version; // e.g. v0.8.28+commit.7893614a
    solc.loadRemoteVersion(v, (err, sol) => (err ? reject(err) : resolve(sol)));
  });

/** Strip the trailing Solidity CBOR metadata (the IPFS/swarm hash differs per build). */
function stripMeta(bytecode) {
  let b = (bytecode || "").toLowerCase().replace(/^0x/, "");
  if (b.length >= 4) {
    const len = parseInt(b.slice(-4), 16); // last 2 bytes = metadata length
    if (Number.isFinite(len) && len > 0 && (len + 2) * 2 <= b.length) b = b.slice(0, b.length - (len + 2) * 2);
  }
  return b;
}

export async function verifyContract(chainId, body) {
  const { address, source, contractName, compilerVersion, optimization = false, runs = 200, evmVersion } = body || {};
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) return { ok: false, error: "invalid address" };
  if (!source || !contractName || !compilerVersion)
    return { ok: false, error: "source, contractName and compilerVersion are required" };
  // Harden the public verify endpoint against remote-compile DoS: pin compilerVersion to the
  // canonical solc release tag so loadRemoteVersion can only fetch a REAL, known solc build
  // (never an attacker-chosen URL), and cap source/name/runs so one request can't drive an
  // unbounded compile.
  if (!/^v?\d+\.\d+\.\d+\+commit\.[0-9a-f]{8}$/.test(compilerVersion))
    return { ok: false, error: "compilerVersion must be a solc release tag, e.g. v0.8.28+commit.7893614a" };
  if (typeof source !== "string" || source.length > 500_000)
    return { ok: false, error: "source too large (max 500 KB)" };
  if (typeof contractName !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/.test(contractName))
    return { ok: false, error: "invalid contractName" };
  if (evmVersion !== undefined && !/^[a-z]{4,20}$/.test(String(evmVersion)))
    return { ok: false, error: "invalid evmVersion" };
  const url = rpcFor(chainId);
  if (!url) return { ok: false, error: "this network is not indexed / has no RPC" };

  const onchain = stripMeta(await rpc(url, "eth_getCode", [address, "latest"]).catch(() => "0x"));
  if (!onchain) return { ok: false, error: "no contract code at that address" };

  let sol;
  try {
    sol = await loadCompiler(compilerVersion);
  } catch (e) {
    return { ok: false, error: `could not load solc ${compilerVersion}: ${e.message}` };
  }

  const input = {
    language: "Solidity",
    sources: { "Contract.sol": { content: source } },
    settings: {
      optimizer: { enabled: !!optimization, runs: Math.min(Math.max(Number(runs) || 200, 1), 1_000_000) },
      ...(evmVersion ? { evmVersion } : {}),
      outputSelection: { "*": { "*": ["abi", "evm.deployedBytecode.object"] } },
    },
  };

  let out;
  try {
    out = JSON.parse(sol.compile(JSON.stringify(input)));
  } catch (e) {
    return { ok: false, error: "compile failed: " + e.message };
  }
  const errors = (out.errors || []).filter((e) => e.severity === "error");
  if (errors.length) return { ok: false, error: "compile errors", details: errors.map((e) => e.formattedMessage) };

  let compiled = null;
  for (const file of Object.values(out.contracts || {})) {
    if (file[contractName]) {
      compiled = file[contractName];
      break;
    }
  }
  if (!compiled) return { ok: false, error: `contract "${contractName}" not found in the provided source` };
  const compiledCode = stripMeta(compiled.evm?.deployedBytecode?.object || "");
  if (!compiledCode) return { ok: false, error: "no deployed bytecode produced" };

  if (compiledCode !== onchain) {
    return {
      ok: false,
      error: "bytecode mismatch — check the compiler version, optimization settings and contract name",
      compiledLen: compiledCode.length,
      onchainLen: onchain.length,
    };
  }

  const rec = {
    chain_id: chainId,
    address: address.toLowerCase(),
    name: contractName,
    compiler: compilerVersion,
    optimization: optimization ? 1 : 0,
    runs: Number(runs) || 200,
    evm_version: evmVersion || null,
    source,
    abi: JSON.stringify(compiled.abi || []),
    constructor_args: body.constructorArgs || null,
    verified_at: Math.floor(Date.now() / 1000),
  };
  await db.contractPut(rec);
  return { ok: true, address: rec.address, name: contractName, compiler: compilerVersion };
}
