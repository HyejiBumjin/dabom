import { z } from "zod";

const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const preparedCheckoutSchema = z.discriminatedUnion("existing", [
  z.object({ existing: z.literal(true), reportId: identifier }),
  z.object({ existing: z.literal(false), orderId: identifier, amount: z.number().int().positive(), orderName: z.string().min(1).max(100) }),
]);
export const confirmedCheckoutSchema = z.object({ reportId: identifier });

export class CheckoutLoginRequired extends Error {}

/** A timeout includes reading the body. Retrying only checks the same order;
 * this request never charges a card or creates a second payment ID. */
export async function postCheckout<T>(
  endpoint: "prepare" | "confirm",
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  signal: AbortSignal,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetch(`/api/saju/payments/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.any([signal, deadline]),
    });
    if (response.status === 401) throw new CheckoutLoginRequired();
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = z.object({ error: z.string().min(1).max(240) }).safeParse(data);
      throw new Error(error.success ? error.data.error : "결제 상태를 확인하지 못했어. 잠시 뒤 다시 눌러줘.");
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error("결제 정보를 확인하지 못했어. 잠시 뒤 다시 눌러줘.");
    return parsed.data;
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (deadline.aborted) throw new Error("연결이 오래 걸리고 있어. 이미 결제했다면 다시 결제하지 말고 결제 확인이나 내 운세함에서 이어가줘.");
    if (cause instanceof CheckoutLoginRequired) throw cause;
    if (cause instanceof SyntaxError || cause instanceof TypeError) throw new Error("결제 서버에 연결하지 못했어. 잠시 뒤 다시 눌러줘.");
    throw cause;
  }
}
