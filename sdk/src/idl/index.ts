import type { Idl } from "@anchor-lang/core";
import idlJson from "./veilpay.json";
import type { Veilpay } from "./veilpay";

/** The VeilPay program IDL, vendored into the SDK so it ships self-contained. */
export const VEILPAY_IDL = idlJson as Idl;

/** Default program ID baked into the IDL (`declare_id!`). */
export const VEILPAY_PROGRAM_ID = (idlJson as { address: string }).address;

export type { Veilpay };
