"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTossCardVariantKey } from "@/lib/toss/client";
import { runtimeConfig } from "@/lib/runtime-config";

declare global {
  interface Window {
    TossPayments?: {
      PaymentWidget: new (clientKey: string, customerKey: string) => {
        renderPaymentMethods: (
          selector: string,
          options: { value: number },
          renderOptions?: { variantKey?: string }
        ) => Promise<void>;
        renderAgreement: (selector: string) => Promise<void>;
        requestPayment: (params: {
          orderId: string;
          orderName: string;
          amount: number;
          successUrl: string;
          failUrl: string;
          customerEmail?: string;
        }) => Promise<void>;
      };
    };
  }
}

interface TossCheckoutWidgetProps {
  orderId: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  disabled?: boolean;
  onReady?: () => void;
  onRequestPayment?: () => void;
}

export function TossCheckoutWidget({
  orderId,
  amount,
  orderName,
  customerEmail,
  disabled,
  onReady,
  onRequestPayment,
}: TossCheckoutWidgetProps) {
  const [loaded, setLoaded] = useState(false);
  const [widget, setWidget] = useState<InstanceType<NonNullable<typeof window.TossPayments>["PaymentWidget"]> | null>(null);

  const cardKey = getTossCardVariantKey();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!runtimeConfig.tossReady || !cardKey) return;

    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/widget";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [cardKey]);

  useEffect(() => {
    if (!loaded || !cardKey || disabled || !amount) return;

    const clientKey = cardKey;
    const customerKey = customerEmail || `guest-${Date.now()}`;
    const PaymentWidget = (window.TossPayments as unknown as { PaymentWidget?: new (a: string, b: string) => InstanceType<NonNullable<typeof window.TossPayments>["PaymentWidget"]> })?.PaymentWidget;
    if (!PaymentWidget) return;

    const pw = new PaymentWidget(clientKey, customerKey);
    pw.renderPaymentMethods("#payment-method-widget", { value: amount }, { variantKey: cardKey }).catch(() => {});
    pw.renderAgreement("#agreement-widget").catch(() => {});
    setWidget(pw);
    onReady?.();
  }, [loaded, cardKey, customerEmail, disabled, amount, onReady]);

  const requestPayment = useCallback(async () => {
    if (!widget || !orderId || !amount) return;
    const successUrl = `${appUrl}/checkout/success?orderId=${encodeURIComponent(orderId)}&amount=${amount}`;
    const failUrl = `${appUrl}/checkout/fail`;

    try {
      await widget.requestPayment({
        orderId,
        orderName,
        amount,
        successUrl,
        failUrl,
        customerEmail,
      });
    } catch (e) {
      console.error(e);
      onRequestPayment?.();
    }
  }, [widget, orderId, amount, orderName, appUrl, customerEmail, onRequestPayment]);

  if (!runtimeConfig.tossReady) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
        Toss Payments가 설정되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div id="payment-method-widget" className="min-h-[120px]" />
      <div id="agreement-widget" />
      <Button
        onClick={requestPayment}
        disabled={disabled || !orderId || !amount}
        className="w-full"
      >
        {amount.toLocaleString()}원 결제하기
      </Button>
    </div>
  );
}
