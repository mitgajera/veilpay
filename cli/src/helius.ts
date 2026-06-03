import fetch from "node-fetch";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const HELIUS_RPC = `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;

export async function fetchProgramEvents(programId: string) {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "veilpay",
      method: "getSignaturesForAddress",
      params: [programId, { limit: 20 }]
    })
  });

  const json = await res.json() as { result?: any[] };
  return json.result ?? [];
}
