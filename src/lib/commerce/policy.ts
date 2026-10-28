import { z } from "zod";

/** Public information only. Never put payment or service credentials here. */
export const merchant = {
  name: "찌야",
  representative: "최혜지",
  registrationNumber: "329-06-03628",
  address: "서울특별시 관악구 시흥대로158가길 9, 301호",
  phone: "010-2370-1667",
  email: "att1667.hj@gmail.com",
  mailOrderRegistration: "2026-서울관악-2068",
  // Registration is confirmed. Verify the PG-accepted contact number
  // before opening live sales.
  businessDetailsVerified: false,
};

export const YEARLY_PRICE = 3900;
export const POLICY_VERSION = "2026-10-28.3";
// Enable only after the privacy transfer/retention procedures are verified.
export const POLICY_EFFECTIVE_DATE: string | null = null;
export function isCommerceReady() {
  return Boolean(POLICY_EFFECTIVE_DATE && merchant.businessDetailsVerified && merchant.mailOrderRegistration);
}

export const checkoutNotices = {
  terms: "이용약관과 주문 내용(대상 정보·상품·금액)을 확인하고 구매에 동의해요.",
  digitalContent: "예시와 환불 기준을 확인했어요. 결제 후 리포트 제공을 요청하며, 정상 제공이 시작된 디지털콘텐츠는 법령상 요건을 충족한 경우 단순 변심에 의한 청약철회가 제한됨을 확인해요. 미제공·하자·계약과 다른 이행에 대한 권리는 유지돼요.",
};

export const checkoutConsentSchema = z.object({
  version: z.literal(POLICY_VERSION),
  terms: z.literal(true),
  digitalContent: z.literal(true),
}).strict();
export type CheckoutConsent = z.infer<typeof checkoutConsentSchema>;
export type CheckoutConsentRecord = CheckoutConsent & {
  acceptedAt: string;
  termsText: string;
  digitalContentText: string;
  productName: string;
  amount: number;
  sampleVersion: string;
};

export function recordCheckoutConsent(input: unknown, productName: string, amount: number): CheckoutConsentRecord {
  const parsed = checkoutConsentSchema.safeParse(input);
  if (!parsed.success) throw new Error("CHECKOUT_CONSENT_REQUIRED");
  return { ...parsed.data, acceptedAt: new Date().toISOString(), termsText: checkoutNotices.terms,
    digitalContentText: checkoutNotices.digitalContent, productName, amount, sampleVersion: POLICY_VERSION };
}
