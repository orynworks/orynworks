import {
  recoverTypedDataAddress,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { x402Nonce, type DbClient } from "@oryn/db";
import { env } from "../env.js";

export type X402Payload = {
  amountUsdc: string; // decimal string with up to 6 decimals
  recipient: Address;
  expiry: number; // unix timestamp seconds
  signature: Hex;
};

export type X402VerifyResult =
  | { ok: true; payerAddress: Address }
  | { ok: false; status: 402; reason: string };

export async function verifyX402(
  db: DbClient,
  paymentHeader: string,
  expectedAmount: string,
  expectedRecipient: Address
): Promise<X402VerifyResult> {
  let payload: X402Payload;
  try {
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    payload = JSON.parse(decoded);
  } catch {
    return { ok: false, status: 402, reason: "malformed X-PAYMENT header" };
  }

  if (
    !payload.amountUsdc ||
    !payload.recipient ||
    !payload.expiry ||
    !payload.signature
  ) {
    return { ok: false, status: 402, reason: "missing payment fields" };
  }

  if (payload.expiry < Math.floor(Date.now() / 1000)) {
    return { ok: false, status: 402, reason: "expired payment" };
  }

  if (parseUnits(payload.amountUsdc, 6) < parseUnits(expectedAmount, 6)) {
    return { ok: false, status: 402, reason: "insufficient amount" };
  }

  if (payload.recipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { ok: false, status: 402, reason: "wrong recipient" };
  }

  try {
    const payerAddress = await recoverTypedDataAddress({
      domain: { name: "Oryn x402", version: "1", chainId: env.X402_CHAIN_ID },
      types: {
        Payment: [
          { name: "amountUsdc", type: "string" },
          { name: "recipient", type: "address" },
          { name: "expiry", type: "uint256" },
        ],
      },
      primaryType: "Payment",
      message: {
        amountUsdc: payload.amountUsdc,
        recipient: payload.recipient,
        expiry: BigInt(payload.expiry),
      },
      signature: payload.signature,
    });

    try {
      await db.insert(x402Nonce).values({ signature: payload.signature });
    } catch {
      return { ok: false, status: 402, reason: "signature already used" };
    }

    return { ok: true, payerAddress };
  } catch (e) {
    return {
      ok: false,
      status: 402,
      reason: `invalid signature${e instanceof Error ? `: ${e.message.slice(0, 60)}` : ""}`,
    };
  }
}
