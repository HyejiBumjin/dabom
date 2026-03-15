import { env } from "@/lib/env";

export interface PortOnePayment {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
}

function extractAmount(rawAmount: unknown): number {
  if (typeof rawAmount === "number") return rawAmount;
  if (rawAmount && typeof rawAmount === "object") {
    const total = (rawAmount as { total?: unknown }).total;
    if (typeof total === "number") return total;
  }
  throw new Error("Invalid PortOne amount");
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
  });

  const data = (await res.json()) as {
    id?: string;
    paymentId?: string;
    status?: string;
    amount?: unknown;
  };

  if (!res.ok || !data) {
    throw new Error("PortOne payment lookup failed");
  }

  const id = data.id || data.paymentId || paymentId;
  const status = data.status || "";
  return {
    id,
    paymentId: id,
    status,
    amount: extractAmount(data.amount),
  };
}
