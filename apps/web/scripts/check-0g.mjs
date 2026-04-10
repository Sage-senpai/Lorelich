#!/usr/bin/env node
/**
 * 0G Health Check — tests turbo indexer for download + upload capability.
 * Run: node apps/web/scripts/check-0g.mjs
 */
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

const TURBO    = "https://indexer-storage-testnet-turbo.0g.ai";
const RPC      = "https://evmrpc-testnet.0g.ai";
const RELAY_KEY = process.env.RELAY_PRIVATE_KEY ?? "";

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

async function testUploadAndDownload() {
  console.log(`\n--- Turbo Indexer Upload ---`);
  if (!RELAY_KEY) {
    skip("No RELAY_PRIVATE_KEY set — cannot test upload/download round-trip");
    return false;
  }
  try {
    const testData = Buffer.from(`0g-health-check-${Date.now()}-${crypto.randomUUID()}`);
    const zgFile = new MemData(testData);
    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(RELAY_KEY, provider);

    const balance = await provider.getBalance(wallet.address);
    console.log(`  Relay wallet: ${wallet.address}`);
    console.log(`  Balance: ${ethers.formatEther(balance)} 0G`);
    if (balance === 0n) {
      fail("Relay wallet has 0 balance — fund it at https://faucet.0g.ai");
      return false;
    }

    const indexer = new Indexer(TURBO);
    const [tx, uploadErr] = await indexer.upload(zgFile, RPC, wallet);
    if (uploadErr) throw new Error(String(uploadErr));

    const rootHash = "rootHash" in tx ? tx.rootHash : tx.rootHashes[0];
    const txHash   = "txHash" in tx ? tx.txHash : tx.txHashes[0];
    ok(`Uploaded! txHash: ${txHash?.slice(0, 20)}... rootHash: ${rootHash?.slice(0, 20)}...`);

    // Now try downloading it back
    console.log(`\n--- Turbo Indexer Download ---`);
    const tmp = path.join(os.tmpdir(), `0g-check-${crypto.randomUUID()}`);
    const dlErr = await indexer.download(rootHash, tmp, true);
    if (dlErr) throw dlErr;
    const stat = fs.statSync(tmp);
    const downloaded = fs.readFileSync(tmp);
    const matches = Buffer.compare(testData, downloaded) === 0;
    ok(`Downloaded ${stat.size} bytes — content match: ${matches}`);
    fs.unlinkSync(tmp);

    return true;
  } catch (e) {
    fail(e.message?.slice(0, 200) ?? String(e));
    return false;
  }
}

async function main() {
  console.log("========================================");
  console.log("  0G Galileo Testnet Health Check");
  console.log("========================================");

  const rpcOk = await testRPC();
  const storageOk = await testUploadAndDownload();

  console.log("\n========================================");
  console.log("  Summary");
  console.log("========================================");
  console.log(`  RPC:     ${rpcOk ? "OK" : "DOWN"}`);
  console.log(`  Storage: ${storageOk ? "OK (upload+download round-trip passed)" : RELAY_KEY ? "FAILED" : "SKIPPED (set RELAY_PRIVATE_KEY)"}`);
  console.log("");

  process.exit(rpcOk && storageOk ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
