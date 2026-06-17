import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("6QPCy4uju8fKdzje3vkifX6YH6sRZ9ZuzyhdMjb25cGa");

function readCliConfig(): { rpc?: string; wallet?: string } {
  try {
    const cfgPath = path.join(os.homedir(), ".veilpay", "config.json");
    return JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
  } catch {
    return {};
  }
}

export function getProvider() {
  const cfg = readCliConfig();
  const rpcUrl =
    process.env.ANCHOR_PROVIDER_URL ||
    cfg.rpc ||
    "https://api.devnet.solana.com";
  const walletPath =
    process.env.ANCHOR_WALLET ||
    cfg.wallet ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  const keyData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keyData));

  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  return { provider, keypair, connection };
}

export function getProgram() {
  const { provider, keypair, connection } = getProvider();

  // Load IDL from the compiled output (relative to cli/src/)
  const idlPath = path.join(__dirname, "../../target/idl/veilpay.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const program = new anchor.Program(idl, provider) as any;

  return { program, provider, keypair, connection };
}

export function getMintConfigPda(
  programId: PublicKey,
  mintAddress: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_config"), mintAddress.toBuffer()],
    programId
  );
}

export function getBalancePda(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("balance"), owner.toBuffer()],
    programId
  );
}

export function getVaultPda(
  mintConfigKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), mintConfigKey.toBuffer()],
    programId
  );
}

export { PROGRAM_ID };
