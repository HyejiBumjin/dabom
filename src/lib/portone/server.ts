import { env } from "@/lib/env";
import { z } from "zod";

export interface PortOnePayment {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  currency: string;
}

export class PortOnePaymentLookupError extends Error {
  constructor(public readonly status: number) { super("PortOne payment lookup failed"); }
}

export function parsePortOnePayment(raw: unknown, expectedId: string, expectedStoreId: string, expectedChannelKey = env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY, development = process.env.NODE_ENV === "development"): PortOnePayment {
  const parsed = z.object({
    id: z.string().min(1), storeId: z.string().min(1),
    status: z.string().min(1), currency: z.string().min(1),
    amount: z.object({ total: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative().optional() }),
    channel: z.object({ key: z.string().min(1), type: z.enum(["LIVE", "TEST"]) }).optional(),
  }).parse(raw);
  if (parsed.id !== expectedId || parsed.storeId !== expectedStoreId) throw new Error("PortOne payment identity mismatch");
  if (parsed.status === "PAID" && (parsed.amount.cancelled ?? 0) !== 0) throw new Error("PortOne payment has cancellations");
  if (parsed.status === "PAID" && (!parsed.channel || parsed.channel.key !== expectedChannelKey || (!development && parsed.channel.type !== "LIVE"))) throw new Error("PortOne payment channel mismatch");
  return { id: parsed.id, paymentId: parsed.id, amount: parsed.amount.total, status: parsed.status, currency: parsed.currency };
}

export async function getPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const storeId = env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const secret = env.PORTONE_API_SECRET;
  if (!storeId || !secret) {
    throw new Error("PortOne not configured");
  }

  const url = new URL(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`);
  url.searchParams.set("storeId", storeId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `PortOne ${secret}`,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new PortOnePaymentLookupError(res.status);
  }

  return parsePortOnePayment(await res.json(), paymentId, storeId);
}
