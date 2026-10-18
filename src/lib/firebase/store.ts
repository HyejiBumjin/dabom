import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Timestamp, type DocumentSnapshot, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "./admin";
import type { Relationship } from "@/lib/saju/profile-input";
import { canReadDevelopmentPreview, type DevelopmentPreviewAccess } from "@/lib/saju/report-preview-access";
import { allowsDevelopmentReports, paymentCollectionPrefix } from "@/lib/portone/payment-mode";
import { recordCheckoutConsent, type CheckoutConsentRecord } from "@/lib/commerce/policy";

export type Account = { id: string; kakaoId: string; nickname: string; email: string | null; createdAt: Date };
export type Profile = { id: string; userId: string; birthKey: string; name: string; relationship: Relationship; gender: "MALE" | "FEMALE"; birthDate: Date; birthTime: string | null; isLunar: boolean; isLeapMonth: boolean; myeongsik: unknown; createdAt: Date };
export type Product = { id: string; code: string; name: string; price: number; active: boolean };
export type Order = { id: string; userId: string; productId: string; productCode: string; sajuProfileId: string; merchantUid: string; status: "READY" | "PAID" | "FAILED" | "CANCELLED"; amount: number; paidAmount: number | null; paidAt: Date | null; pgTxId: string | null; createdAt: Date; checkoutConsent?: CheckoutConsentRecord };
export type Report = { id: string; userId: string; orderId: string | null; sajuProfileId: string; productCode: string; status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"; content: unknown; promptVersion: string; model: string; retryCount: number; lastError: string | null; createdAt: Date; completedAt: Date | null; generationId?: string; generationStartedAt?: Date; developmentPreviewAccess?: DevelopmentPreviewAccess; firstDeliveredAt?: Date; firstOpenedAt?: Date };
export type ReportWithAccess = Report & { sajuProfile: Profile; order: Order | null };
export type ReportPatch = Partial<Pick<Report, "status" | "content" | "retryCount" | "lastError" | "completedAt" | "promptVersion" | "model">>;
export type NewReport = Pick<Report, "promptVersion" | "model" | "productCode">;
export const stableId = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const validId = (id: string) => /^[A-Za-z0-9_-]{1,128}$/.test(id);

function decode<T>(snapshot: DocumentSnapshot): T | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  for (const [key, value] of Object.entries(data)) if (value instanceof Timestamp) data[key] = value.toDate();
  for (const key of ["myeongsik", "content"]) {
    if (typeof data[`${key}Json`] === "string") data[key] = JSON.parse(data[`${key}Json`]);
    delete data[`${key}Json`];
  }
  return { ...data, id: snapshot.id } as T;
}
function encode(data: object) {
  const encoded: Record<string, unknown> = { ...data };
  // JSON payloads contain nested arrays, which Firestore cannot store as native arrays.
  for (const key of ["myeongsik", "content"]) if (key in encoded) {
    encoded[`${key}Json`] = JSON.stringify(encoded[key] ?? null);
    delete encoded[key];
  }
  for (const [key, value] of Object.entries(encoded)) if (value === undefined) delete encoded[key];
  return encoded;
}

/** Explicit domain operations; Firestore rules deny all direct client requests. */
export class FirebaseStore {
  constructor(private readonly database: () => Firestore = getFirebaseAdminFirestore, private readonly prefix: string | (() => string) = "") {}
  private get collectionPrefix() { return typeof this.prefix === "function" ? this.prefix() : this.prefix; }
  collection(name: string) { return this.database().collection(`${this.collectionPrefix}${name}`); }
  transaction<T>(action: (tx: Transaction) => Promise<T>) { return this.database().runTransaction(action, { maxAttempts: 8 }); }
  async read<T>(collection: string, id: string, tx?: Transaction): Promise<T | null> {
    if (!validId(id)) return null;
    const ref = this.collection(collection).doc(id);
    return decode<T>(await (tx ? tx.get(ref) : ref.get()));
  }
  getAccount(id: string) { return this.read<Account>("users", id); }
  async saveAccount(id: string, kakaoId: string, nickname: string) {
    if (!validId(id) || id !== `kakao_${kakaoId}`) throw new Error("INVALID_IDENTITY");
    return this.transaction(async tx => {
      const existing = await this.read<Account>("users", id, tx);
      const account: Account = { id, kakaoId, nickname, email: null, createdAt: existing?.createdAt ?? new Date() };
      tx.set(this.collection("users").doc(id), account);
      return account;
    });
  }
  getProfile(id: string) { return this.read<Profile>("profiles", id); }
  getProduct(code: string) { return this.read<Product>("products", code); }
  getOrder(id: string) { return this.read<Order>("orders", id); }
  getReport(id: string) { return this.read<Report>("reports", id); }
  profileId(userId: string, birthKey: string) { return stableId(userId, birthKey); }
  reportId(profileId: string, productCode: string) { return stableId(profileId, productCode); }
  orderId(userId: string, profileId: string, productCode: string) {
    const parts = [userId, profileId, productCode];
    // The provider also sees a distinct ID: a local test cannot reserve a live order ID.
    if (this.collectionPrefix) parts.unshift(this.collectionPrefix);
    // NHN KCP accepts at most 40 characters, including our five-character prefix.
    return `saju_${stableId(...parts).slice(0, 35)}`;
  }
  async getReportWithAccess(id: string): Promise<ReportWithAccess | null> {
    const report = await this.getReport(id);
    if (!report) return null;
    const [profile, order] = await Promise.all([this.getProfile(report.sajuProfileId), report.orderId ? this.getOrder(report.orderId) : null]);
    if (!profile || report.userId !== profile.userId) return null;
    const linked = order && order.userId === profile.userId && order.sajuProfileId === profile.id && order.productCode === report.productCode ? order : null;
    return { ...report, sajuProfile: profile, order: linked };
  }
  async saveProfile(data: Omit<Profile, "id" | "createdAt">) {
    const id = this.profileId(data.userId, data.birthKey);
    return this.transaction(async tx => {
      const previous = await this.read<Profile>("profiles", id, tx);
      if (previous && previous.userId !== data.userId) throw new Error("PROFILE_OWNER_MISMATCH");
      if (previous) tx.update(this.collection("profiles").doc(id), { name: data.name, relationship: data.relationship });
      else tx.create(this.collection("profiles").doc(id), encode({ ...data, createdAt: new Date() }));
      return { profileId: id, existing: Boolean(previous) };
    });
  }
  private newReport(userId: string, profileId: string, metadata: NewReport, orderId?: string): Report {
    return { id: this.reportId(profileId, metadata.productCode), userId, sajuProfileId: profileId, orderId: orderId ?? null, ...metadata, status: "PENDING", content: null, retryCount: 0, lastError: null, createdAt: new Date(), completedAt: null };
  }
  async ensureReport(userId: string, profileId: string, metadata: NewReport, orderId?: string, development = allowsDevelopmentReports()) {
    return this.transaction(async tx => {
      const profile = await this.read<Profile>("profiles", profileId, tx);
      if (!profile || profile.userId !== userId) throw new Error("PROFILE_NOT_FOUND");
      const order = orderId ? await this.read<Order>("orders", orderId, tx) : null;
      if (orderId && (!order || order.userId !== userId || order.sajuProfileId !== profileId || order.productCode !== metadata.productCode || order.status !== "PAID")) throw new Error("PAYMENT_REQUIRED");
      if (!development && !order) throw new Error("PAYMENT_REQUIRED");
      const id = this.reportId(profileId, metadata.productCode);
      const existing = await this.read<Report>("reports", id, tx);
      if (existing && (existing.userId !== userId || existing.sajuProfileId !== profileId)) throw new Error("REPORT_OWNER_MISMATCH");
      const report = existing ?? this.newReport(userId, profileId, metadata, orderId);
      if (!existing) tx.create(this.collection("reports").doc(id), encode(report));
      else if (orderId && existing.orderId !== orderId) tx.update(this.collection("reports").doc(id), { orderId });
      return { ...report, orderId: orderId ?? report.orderId };
    });
  }
  async prepareOrder(userId: string, profileId: string, metadata: NewReport, consent?: unknown) {
    const result = await this.transaction(async tx => {
      const profile = await this.read<Profile>("profiles", profileId, tx);
      if (!profile || profile.userId !== userId) throw new Error("PROFILE_NOT_FOUND");
      const product = await this.read<Product>("products", metadata.productCode, tx);
      if (!product || !product.active || !Number.isSafeInteger(product.price) || product.price <= 0) throw new Error("PRODUCT_UNAVAILABLE");
      const id = this.orderId(userId, profileId, product.code);
      const existing = await this.read<Order>("orders", id, tx);
      if (existing && (existing.userId !== userId || existing.sajuProfileId !== profileId || existing.productCode !== product.code)) throw new Error("ORDER_NOT_FOUND");
      if (existing?.status === "CANCELLED") throw new Error("ORDER_CANCELLED");
      const order: Order = existing ?? { id, userId, productId: product.id, productCode: product.code, sajuProfileId: profileId, merchantUid: id, status: "READY", amount: product.price, paidAmount: null, paidAt: null, pgTxId: null, createdAt: new Date() };
      if (order.status !== "PAID") {
        const record = recordCheckoutConsent(consent, product.name, order.amount);
        // Each policy revision has one immutable record. Payment retries cannot
        // replace its original timestamp, wording, account or server price.
        const consentId = stableId(id, record.version);
        const previous = await this.read<CheckoutConsentRecord>("checkoutConsents", consentId, tx);
        order.checkoutConsent = previous ?? record;
        if (!previous) tx.create(this.collection("checkoutConsents").doc(consentId), { ...record, orderId: id, userId, profileId, productCode: product.code });
        if (existing) tx.update(this.collection("orders").doc(id), { checkoutConsent: order.checkoutConsent });
      }
      if (!existing) tx.create(this.collection("orders").doc(id), order);
      return { order, product };
    });
    if (result.order.status === "PAID") {
      const report = await this.ensureReport(userId, profileId, metadata, result.order.id, false);
      return { existing: true as const, reportId: report.id };
    }
    return { existing: false as const, orderId: result.order.id, amount: result.order.amount, orderName: result.product.name };
  }
  async fulfillOrder(userId: string, orderId: string, payment: { id: string; amount: number; status: string; currency: string }, metadata: NewReport) {
    return this.transaction(async tx => {
      const order = await this.read<Order>("orders", orderId, tx);
      if (!order || order.userId !== userId || order.productCode !== metadata.productCode) throw new Error("ORDER_NOT_FOUND");
      const profile = await this.read<Profile>("profiles", order.sajuProfileId, tx);
      if (!profile || profile.userId !== userId) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "CANCELLED") throw new Error("ORDER_CANCELLED");
      if (payment.id !== order.merchantUid || payment.status !== "PAID" || payment.currency !== "KRW" || !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.amount !== order.amount) throw new Error("PAYMENT_MISMATCH");
      const id = this.reportId(profile.id, metadata.productCode);
      const existing = await this.read<Report>("reports", id, tx);
      if (existing && (existing.userId !== userId || existing.orderId && existing.orderId !== order.id)) throw new Error("REPORT_OWNER_MISMATCH");
      const report = existing ?? this.newReport(userId, profile.id, metadata, order.id);
      // A concurrent cancellation forces a transaction retry; CANCELLED is terminal.
      tx.update(this.collection("orders").doc(order.id), { status: "PAID", paidAmount: payment.amount, paidAt: order.paidAt ?? new Date(), pgTxId: payment.id });
      tx.set(this.collection("reports").doc(id), encode({ ...report, orderId: order.id }));
      return { ...report, orderId: order.id };
    });
  }
  async cancelOrder(userId: string, id: string) {
    return this.transaction(async tx => {
      const order = await this.read<Order>("orders", id, tx);
      if (!order || order.userId !== userId) throw new Error("ORDER_NOT_FOUND");
      tx.update(this.collection("orders").doc(id), { status: "CANCELLED" });
    });
  }
  async listLibrary(userId: string, development = allowsDevelopmentReports()) {
    const [profiles, reports, orders] = await Promise.all(["profiles", "reports", "orders"].map(name => this.collection(name).where("userId", "==", userId).get()));
    const paidOrders = new Map(orders.docs.map(doc => { const order = decode<Order>(doc)!; return [order.id, order]; }));
    const allReports = reports.docs.map(doc => decode<Report>(doc)!).map(report => ({ ...report, order: report.orderId ? paidOrders.get(report.orderId) ?? null : null }));
    return profiles.docs.map(doc => decode<Profile>(doc)!).sort((a,b) => b.createdAt.getTime()-a.createdAt.getTime()).map(profile => ({ ...profile, reports: allReports.filter(report => report.sajuProfileId === profile.id && report.userId === profile.userId && (development || canReadDevelopmentPreview(report, userId) || report.order?.status === "PAID" && report.order.sajuProfileId === profile.id && report.order.productCode === report.productCode)).sort((a,b) => b.createdAt.getTime()-a.createdAt.getTime()) }));
  }
  async claimReport(id: string, patch: ReportPatch, userId: string, development = allowsDevelopmentReports()) {
    return this.transaction(async tx => {
      const report = await this.read<Report>("reports", id, tx);
      if (!report || report.userId !== userId || report.status === "COMPLETED") return null;
      const profile = await this.read<Profile>("profiles", report.sajuProfileId, tx);
      const order = report.orderId ? await this.read<Order>("orders", report.orderId, tx) : null;
      if (!profile || profile.userId !== userId || !development && (!order || order.status !== "PAID" || order.userId !== userId || order.sajuProfileId !== profile.id || order.productCode !== report.productCode)) throw new Error("PAYMENT_REQUIRED");
      // Recover an interrupted request after the serverless request budget expires.
      if (report.status === "GENERATING" && report.generationStartedAt && Date.now() - report.generationStartedAt.getTime() < 120_000) return null;
      const generationId = randomUUID();
      tx.update(this.collection("reports").doc(id), encode({ ...patch, status: "GENERATING", generationId, generationStartedAt: new Date() }));
      return generationId;
    });
  }
  async updateReport(id: string, generationId: string, patch: ReportPatch) {
    return this.transaction(async tx => {
      const report = await this.read<Report>("reports", id, tx);
      if (!report || report.generationId !== generationId) throw new Error("REPORT_LEASE_LOST");
      tx.update(this.collection("reports").doc(id), encode(patch));
    });
  }
  /** Delivery is an API response; opened is a visible client render acknowledgement.
   * Neither proves human reading nor automatically rules out a refund. */
  async markReportReceipt(userId: string, id: string, event: "delivered" | "opened") {
    return this.transaction(async tx => {
      const report = await this.read<Report>("reports", id, tx);
      if (!report || report.userId !== userId || report.status !== "COMPLETED" || !report.content || !report.orderId) return false;
      const profile = await this.read<Profile>("profiles", report.sajuProfileId, tx);
      const order = await this.read<Order>("orders", report.orderId, tx);
      if (!profile || profile.userId !== userId || !order || order.userId !== userId || order.status !== "PAID" || order.sajuProfileId !== profile.id || order.productCode !== report.productCode) return false;
      if (event === "opened" && !report.firstDeliveredAt) return false;
      const field = event === "delivered" ? "firstDeliveredAt" : "firstOpenedAt";
      if (!report[field]) tx.update(this.collection("reports").doc(id), { [field]: new Date() });
      return true;
    });
  }
  async consumeRateLimit(accountId: string, scope: string, limit: number, windowMs: number) {
    if (!accountId || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) throw new Error("INVALID_RATE_LIMIT");
    const ref = this.collection("rateLimits").doc(stableId(accountId, scope));
    return this.transaction(async tx => {
      const data = (await tx.get(ref)).data();
      const now = Date.now();
      const active = data && data.resetAt.toMillis() > now;
      if (active && data.hits >= limit) return false;
      tx.set(ref, { hits: active ? data.hits + 1 : 1, resetAt: active ? data.resetAt : Timestamp.fromMillis(now + windowMs) });
      return true;
    });
  }
}
export const firebaseStore = new FirebaseStore(getFirebaseAdminFirestore, paymentCollectionPrefix);
