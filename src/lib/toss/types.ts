export type TossPaymentMethod = "카드" | "가상계좌" | "간편결제" | string;

export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: TossPaymentMethod;
  requestedAt?: string;
  approvedAt?: string;
}
