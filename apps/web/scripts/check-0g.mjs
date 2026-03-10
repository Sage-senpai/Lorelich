#!/usr/bin/env node
/**
 * 0G Health Check — tests both indexers for download + upload capability.
 * Run: node apps/web/scripts/check-0g.mjs
 */
import { Indexer, MemData } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

const STANDARD = "https://indexer-storage-testnet-standard.0g.ai";
const TURBO    = "https://indexer-storage-testnet-turbo.0g.ai";
const RPC      = "https://evmrpc-testnet.0g.ai";
const RELAY_KEY = process.env.RELAY_PRIVATE_KEY ?? "";

// A known rootHash uploaded previously
const TEST_HASH = "0x7438f7a862b260bc9c05d0fbee3ede557054907af7b4326e8e568120fdad0505";

function ok(msg)   { console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
function fail(msg) { console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
function skip(msg) { console.log(`  \x1b[33mSKIP\x1b[0m ${msg}`); }

async function testRPC() {
  console.log("\n--- RPC Node ---");
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const block = await provider.getBlockNumber();
    ok(`Block: ${block}`);
    return true;
  } catch (e) {
    fail(e.message);
    return false;
  }
}

async function testDownload(name, url) {
  console.log(`\n--- ${name} Download ---`);
  const tmp = path.join(os.tmpdir(), `0g-check-${crypto.randomUUID()}`);
  try {
    const indexer = new Indexer(url);
    const err = await indexer.download(TEST_HASH, tmp, false);
    if (err) throw err;
    const stat = fs.statSync(tmp);
    ok(`Downloaded ${stat.size} bytes`);
    fs.unlinkSync(tmp);
    return true;
  } catch (e) {
    fail(e.message?.slice(0, 120) ?? String(e));
    try { fs.unlinkSync(tmp); } catch {}
    return false;
  }
}

async function testUpload(name, url) {
  console.log(`\n--- ${name} Upload ---`);
  if (!RELAY_KEY) {
    skip("No RELAY_PRIVATE_KEY set");
    return false;
  }
  try {
    const testData = Buffer.from(`0g-health-check-${Date.now()}-${crypto.randomUUID()}`);
    const zgFile = new MemData(testData);
    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(RELAY_KEY, provider);
    const indexer = new Indexer(url);

    const [result, uploadErr] = await indexer.upload(zgFile, RPC, wallet);
    if (uploadErr) throw new Error(String(uploadErr));
    ok(`Uploaded! txHash: ${result?.txHash?.slice(0, 20)}... rootHash: ${result?.rootHash?.slice(0, 20)}...`);
    return true;
  } catch (e) {
    fail(e.message?.slice(0, 120) ?? String(e));
    return false;
  }
}

async function main() {
  console.log("========================================");
  console.log("  0G Galileo Testnet Health Check");
  console.log("========================================");

  const results = {};

  // RPC
  results.rpc = await testRPC();

  // Downloads
  results.standardDl = await testDownload("Standard", STANDARD);
  results.turboDl    = await testDownload("Turbo", TURBO);

  // Uploads (only if RELAY_KEY is set)
  results.standardUp = await testUpload("Standard", STANDARD);
  results.turboUp    = await testUpload("Turbo", TURBO);

  // Summary
  console.log("\n========================================");
  console.log("  Summary");
  console.log("========================================");
  console.log(`  RPC:                ${results.rpc ? "OK" : "DOWN"}`);
  console.log(`  Standard Download:  ${results.standardDl ? "OK" : "DOWN"}`);
  console.log(`  Turbo Download:     ${results.turboDl ? "OK" : "DOWN"}`);
  console.log(`  Standard Upload:    ${results.standardUp ? "OK" : "DOWN/SKIP"}`);
  console.log(`  Turbo Upload:       ${results.turboUp ? "OK" : "DOWN/SKIP"}`);

  const anyDownload = results.standardDl || results.turboDl;
  const anyUpload   = results.standardUp || results.turboUp;
  console.log("");
  console.log(`  Download available: ${anyDownload ? "YES (fallback works)" : "NO — both indexers down"}`);
  console.log(`  Upload available:   ${anyUpload ? "YES (fallback works)" : RELAY_KEY ? "NO — both indexers down" : "SKIPPED (no relay key)"}`);
  console.log("");

  process.exit(anyDownload ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
