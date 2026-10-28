import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { FieldPath, Timestamp, type DocumentSnapshot, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "./admin";
import type { Relationship } from "@/lib/saju/profile-input";
import { canReadDevelopmentPreview, type DevelopmentPreviewAccess } from "@/lib/saju/report-preview-access";
import { allowsDevelopmentReports, paymentCollectionPrefix } from "@/lib/portone/payment-mode";
import { recordCheckoutConsent, type CheckoutConsentRecord } from "@/lib/commerce/policy";
import { assertProfileAge } from "@/lib/saju/profile-age";
import { READ_ACCOUNT_LIMIT, READ_LEASE_SIZE, READ_WINDOW_MS } from "@/lib/security/read-rate-limit";
import { LIBRARY_PAGE_SIZE, LIBRARY_REPORT_LIMIT, libraryFilter, parseLibraryCursor, type LibraryFilter } from "@/lib/saju/library-page";
import { isPaymentReadFresh, isPaymentGenerationFresh, PAYMENT_CHECK_LEASE_MS, PAYMENT_CHECK_RETRY_MS, type PaymentVerification, type PaymentCheckOutcome } from "@/lib/portone/verification-policy";

export type Account = { id: string; kakaoId: string; nickname: string; email: string | null; createdAt: Date; dataEpoch?: string; deletionPending?: boolean };
export type Profile = { id: string; userId: string; birthKey: string; name: string; relationship: Relationship; gender: "MALE" | "FEMALE"; birthDate: Date; birthTime: string | null; isLunar: boolean; isLeapMonth: boolean; myeongsik: unknown; createdAt: Date };
export type Product = { id: string; code: string; name: string; price: number; active: boolean };
export type Order = PaymentVerification & { id: string; userId: string; productId: string; productCode: string; sajuProfileId: string; merchantUid: string; status: "READY" | "PAID" | "FAILED" | "CANCELLED"; amount: number; paidAmount: number | null; paidAt: Date | null; pgTxId: string | null; createdAt: Date; checkoutConsent?: CheckoutConsentRecord };
export type Report = { id: string; userId: string; orderId: string | null; sajuProfileId: string; productCode: string; status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED"; content: unknown; promptVersion: string; model: string; retryCount: number; lastError: string | null; createdAt: Date; completedAt: Date | null; generationId?: string; generationStartedAt?: Date; developmentPreviewAccess?: DevelopmentPreviewAccess; firstDeliveredAt?: Date; firstOpenedAt?: Date };
export type ReportWithAccess = Report & { sajuProfile: Profile; order: Order | null };
export type ReportPatch = Partial<Pick<Report, "status" | "content" | "retryCount" | "lastError" | "completedAt" | "promptVersion" | "model">>;
export type NewReport = Pick<Report, "promptVersion" | "model" | "productCode">;
type LibraryProfileRecord = Pick<Profile, "id" | "userId" | "name" | "relationship" | "birthDate" | "birthTime" | "isLunar" | "createdAt">;
type LibraryReportRecord = Pick<Report, "id" | "userId" | "sajuProfileId" | "productCode" | "status" | "orderId" | "createdAt" | "developmentPreviewAccess">;
type LibraryOrderRecord = Pick<Order, "id" | "userId" | "sajuProfileId" | "productCode" | "status">;
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
  async getAccount(id: string) {
    const account = await this.read<Account>("users", id);
    return account?.deletionPending ? null : account;
  }
  /** Read in the same transaction as a write so a deletion cannot race it. */
  async requireActiveAccount(id: string, tx: Transaction) {
    const account = await this.read<Account>("users", id, tx);
    if (!account || account.deletionPending) throw new Error("ACCOUNT_UNAVAILABLE");
    return account;
  }
  async saveAccount(id: string, kakaoId: string, nickname: string) {
    if (!validId(id) || id !== `kakao_${kakaoId}`) throw new Error("INVALID_IDENTITY");
    return this.transaction(async tx => {
      const existing = await this.read<Account>("users", id, tx);
      if (existing?.deletionPending) throw new Error("ACCOUNT_UNAVAILABLE");
      // Old accounts keep their original IDs. Rejoining gets a new namespace,
      // so a retired provider payment ID can never buy a second report.
      const account: Account = { id, kakaoId, nickname, email: null, createdAt: existing?.createdAt ?? new Date(),
        ...(existing ? existing.dataEpoch ? { dataEpoch: existing.dataEpoch } : {} : { dataEpoch: randomUUID() }) };
      tx.set(this.collection("users").doc(id), account);
      return account;
    });
  }
  getProfile(id: string) { return this.read<Profile>("profiles", id); }
  getProduct(code: string) { return this.read<Product>("products", code); }
  getOrder(id: string) { return this.read<Order>("orders", id); }
  getReport(id: string) { return this.read<Report>("reports", id); }
  async profileId(userId: string, birthKey: string) {
    const account = await this.getAccount(userId);
    if (!account) throw new Error("ACCOUNT_UNAVAILABLE");
    return account.dataEpoch ? stableId(userId, birthKey, account.dataEpoch) : stableId(userId, birthKey);
  }
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
  async saveProfile(data: Omit<Profile, "id" | "createdAt">, expectedEpoch: string) {
    assertProfileAge(data);
    return this.transaction(async tx => {
      const account = await this.requireActiveAccount(data.userId, tx);
      if ((account.dataEpoch ?? "legacy") !== expectedEpoch) throw new Error("ACCOUNT_CHANGED");
      const id = account.dataEpoch ? stableId(data.userId, data.birthKey, account.dataEpoch) : stableId(data.userId, data.birthKey);
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
      await this.requireActiveAccount(userId, tx);
      const profile = await this.read<Profile>("profiles", profileId, tx);
      if (!profile || profile.userId !== userId) throw new Error("PROFILE_NOT_FOUND");
      const order = orderId ? await this.read<Order>("orders", orderId, tx) : null;
      if (orderId && (!order || order.userId !== userId || order.sajuProfileId !== profileId || order.productCode !== metadata.productCode || order.status !== "PAID")) throw new Error("PAYMENT_REQUIRED");
      if (!development && !order) throw new Error("PAYMENT_REQUIRED");
      const id = this.reportId(profileId, metadata.productCode);
      const existing = await this.read<Report>("reports", id, tx);
      if (existing && (existing.userId !== userId || existing.sajuProfileId !== profileId)) throw new Error("REPORT_OWNER_MISMATCH");
      if (existing?.status !== "COMPLETED") assertProfileAge(profile);
      const report = existing ?? this.newReport(userId, profileId, metadata, orderId);
      if (!existing) tx.create(this.collection("reports").doc(id), encode(report));
      else if (orderId && existing.orderId !== orderId) tx.update(this.collection("reports").doc(id), { orderId });
      return { ...report, orderId: orderId ?? report.orderId };
    });
  }
  async prepareOrder(userId: string, profileId: string, metadata: NewReport, consent?: unknown) {
    const result = await this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
      const profile = await this.read<Profile>("profiles", profileId, tx);
      if (!profile || profile.userId !== userId) throw new Error("PROFILE_NOT_FOUND");
      assertProfileAge(profile);
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
      await this.requireActiveAccount(userId, tx);
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
      tx.update(this.collection("orders").doc(order.id), {
        status: "PAID", paidAmount: payment.amount, paidAt: order.paidAt ?? new Date(), pgTxId: payment.id,
        // A duplicate initial confirmation may arrive after a newer recheck.
        // Only the first fulfillment initializes freshness; later checks use CAS.
        ...(order.status !== "PAID" ? { paymentVerifiedAt: new Date(), paymentCheckState: "VERIFIED", paymentCheckId: null, paymentCheckLeaseUntil: null, paymentCheckRetryAt: null } : {}),
      });
      tx.set(this.collection("reports").doc(id), encode({ ...report, orderId: order.id }));
      return { ...report, orderId: order.id };
    });
  }
  async cancelOrder(userId: string, id: string) {
    return this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
      const order = await this.read<Order>("orders", id, tx);
      if (!order || order.userId !== userId) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "CANCELLED") return;
      tx.update(this.collection("orders").doc(id), { status: "CANCELLED", cancelledAt: new Date(), paymentCheckState: "REJECTED", paymentCheckId: null, paymentCheckLeaseUntil: null, paymentCheckRetryAt: null });
    });
  }
  /** A shared lease bounds provider calls across tabs and server instances. */
  async beginPaymentCheck(userId: string, id: string, force: boolean) {
    return this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
      const order = await this.read<Order>("orders", id, tx);
      if (!order || order.userId !== userId) throw new Error("ORDER_NOT_FOUND");
      const now = Date.now();
      if (order.status !== "PAID") return { kind: "denied" as const, order };
      if (!force && isPaymentReadFresh(order, now)) return { kind: "cached" as const, order };
      if ((order.paymentCheckLeaseUntil?.getTime() ?? 0) > now) return { kind: "busy" as const, order };
      if ((order.paymentCheckRetryAt?.getTime() ?? 0) > now) return { kind: "cooldown" as const, order };
      const checkId = randomUUID();
      tx.update(this.collection("orders").doc(id), { paymentCheckId: checkId, paymentCheckStartedAt: new Date(now), paymentCheckLeaseUntil: new Date(now + PAYMENT_CHECK_LEASE_MS) });
      return { kind: "claimed" as const, order, checkId };
    });
  }
  async finishPaymentCheck(userId: string, id: string, checkId: string, outcome: PaymentCheckOutcome) {
    return this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
      const order = await this.read<Order>("orders", id, tx);
      if (!order || order.userId !== userId) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "CANCELLED") return { applied: false, order };
      // A verified cancellation is terminal, including an expired worker's result.
      if (outcome === "cancelled") {
        const patch = { status: "CANCELLED" as const, cancelledAt: new Date(), paymentCheckState: "REJECTED" as const, paymentCheckId: null, paymentCheckLeaseUntil: null, paymentCheckRetryAt: null };
        tx.update(this.collection("orders").doc(id), patch);
        return { applied: true, order: { ...order, ...patch } };
      }
      const now = Date.now();
      if (order.status !== "PAID" || order.paymentCheckId !== checkId || (order.paymentCheckLeaseUntil?.getTime() ?? 0) <= now) return { applied: false, order };
      const state = outcome === "verified" ? "VERIFIED" : outcome === "unavailable" && order.paymentCheckState !== "REJECTED" ? "UNAVAILABLE" : "REJECTED";
      const patch = {
        paymentCheckState: state as NonNullable<PaymentVerification["paymentCheckState"]>,
        paymentCheckId: null, paymentCheckLeaseUntil: null,
        paymentCheckRetryAt: outcome === "verified" ? null : new Date(now + PAYMENT_CHECK_RETRY_MS),
        // Use lookup start, not completion. Repeated failures cannot renew grace.
        ...(outcome === "verified" ? { paymentVerifiedAt: order.paymentCheckStartedAt! } : {}),
      };
      tx.update(this.collection("orders").doc(id), patch);
      return { applied: true, order: { ...order, ...patch } };
    });
  }
  async listLibrary(userId: string, development = allowsDevelopmentReports()) {
    return (await this.listLibraryPage(userId, {}, development)).profiles;
  }
  async listLibraryPage(userId: string, options: { after?: string; relationship?: LibraryFilter; profile?: string; historyAfter?: string } = {}, development = allowsDevelopmentReports()) {
    if (!validId(userId)) throw new Error("INVALID_IDENTITY");
    const relationship = libraryFilter(options.relationship);
    let query = this.collection("profiles").where("userId", "==", userId);
    // A history link still scopes the profile lookup to its authenticated owner.
    if (options.profile) {
      if (!validId(options.profile)) return { profiles: [], nextCursor: null };
      query = query.where(FieldPath.documentId(), "==", options.profile);
    }
    if (relationship !== "ALL") query = query.where("relationship", "==", relationship);
    query = query.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
    const cursor = parseLibraryCursor(options.after);
    if (cursor) query = query.startAfter(Timestamp.fromMillis(cursor.time), cursor.id);
    const page = await query.select("userId", "name", "relationship", "birthDate", "birthTime", "isLunar", "createdAt").limit(LIBRARY_PAGE_SIZE + 1).get();
    const docs = page.docs.slice(0, LIBRARY_PAGE_SIZE);
    const profiles = await Promise.all(docs.map(async doc => {
      const profile = decode<LibraryProfileRecord>(doc)!;
      // Catalogue metadata only. Never load paid letter bodies or birth charts.
      let reportQuery = this.collection("reports").where("userId", "==", userId).where("sajuProfileId", "==", profile.id)
        .orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc");
      const historyCursor = options.profile ? parseLibraryCursor(options.historyAfter) : null;
      if (historyCursor) reportQuery = reportQuery.startAfter(Timestamp.fromMillis(historyCursor.time), historyCursor.id);
      const snapshots = await reportQuery.select("userId", "sajuProfileId", "productCode", "status", "orderId", "createdAt", "developmentPreviewAccess").limit(LIBRARY_REPORT_LIMIT + 1).get();
      const reportDocs = snapshots.docs.slice(0, LIBRARY_REPORT_LIMIT);
      const reports = await Promise.all(reportDocs.map(async snapshot => {
        const report = decode<LibraryReportRecord>(snapshot)!;
        const order = report.orderId && validId(report.orderId)
          ? decode<LibraryOrderRecord>((await this.database().getAll(this.collection("orders").doc(report.orderId), { fieldMask: ["userId", "sajuProfileId", "productCode", "status"] }))[0]) : null;
        const paid = order?.userId === userId && order.status === "PAID" && order.sajuProfileId === profile.id && order.productCode === report.productCode;
        // Older operator-granted previews predate catalogue metadata. Inspect only
        // those explicit grants, retaining the existing nonempty-content check.
        const preview = !order && report.orderId === null && report.status === "COMPLETED" && report.developmentPreviewAccess?.userId === userId
          ? await this.getReport(report.id) : null;
        if (!development && !paid && !(preview && canReadDevelopmentPreview(preview, userId))) return null;
        return { id: report.id, productCode: report.productCode, status: report.status, createdAt: report.createdAt, order: paid ? order : null };
      }));
      const lastReport = reportDocs.at(-1);
      const nextReportCursor = snapshots.size > LIBRARY_REPORT_LIMIT && lastReport ? Buffer.from(JSON.stringify({ time: lastReport.get("createdAt").toMillis(), id: lastReport.id })).toString("base64url") : null;
      return { ...profile, nextReportCursor, reports: reports.filter(report => report !== null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) };
    }));
    const last = profiles.at(-1);
    const nextCursor = page.size > LIBRARY_PAGE_SIZE && last ? Buffer.from(JSON.stringify({ time: last.createdAt.getTime(), id: last.id })).toString("base64url") : null;
    return { profiles, nextCursor };
  }
  async claimReport(id: string, patch: ReportPatch, userId: string, development = allowsDevelopmentReports()) {
    return this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
      const report = await this.read<Report>("reports", id, tx);
      if (!report || report.userId !== userId || report.status === "COMPLETED") return null;
      const profile = await this.read<Profile>("profiles", report.sajuProfileId, tx);
      const order = report.orderId ? await this.read<Order>("orders", report.orderId, tx) : null;
      if (!profile || profile.userId !== userId || !development && (!order || order.status !== "PAID" || order.userId !== userId || order.sajuProfileId !== profile.id || order.productCode !== report.productCode)) throw new Error("PAYMENT_REQUIRED");
      assertProfileAge(profile);
      if (order && !isPaymentGenerationFresh(order)) throw new Error("PAYMENT_RECHECK_REQUIRED");
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
      await this.requireActiveAccount(report.userId, tx);
      const order = report.orderId ? await this.read<Order>("orders", report.orderId, tx) : null;
      if (report.orderId && (!order || order.status !== "PAID" || order.userId !== report.userId || order.paymentCheckState === "REJECTED")) throw new Error("PAYMENT_REQUIRED");
      tx.update(this.collection("reports").doc(id), encode(patch));
    });
  }
  /** Delivery is an API response; opened is a visible client render acknowledgement.
   * Neither proves human reading nor automatically rules out a refund. */
  async markReportReceipt(userId: string, id: string, event: "delivered" | "opened") {
    return this.transaction(async tx => {
      await this.requireActiveAccount(userId, tx);
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
  async reserveAccountReads(accountId: string) {
    if (!validId(accountId)) throw new Error("INVALID_RATE_LIMIT");
    const ref = this.collection("rateLimits").doc(stableId(accountId, "account-read-v1"));
    return this.transaction(async tx => {
      const data = (await tx.get(ref)).data();
      const now = Date.now();
      const resetAt = (Math.floor(now / READ_WINDOW_MS) + 1) * READ_WINDOW_MS;
      const hits = data?.resetAt instanceof Timestamp && data.resetAt.toMillis() === resetAt ? data.hits : 0;
      if (!Number.isSafeInteger(hits) || hits < 0) throw new Error("INVALID_READ_QUOTA");
      const credits = Math.min(READ_LEASE_SIZE, Math.max(0, READ_ACCOUNT_LIMIT - hits));
      if (credits) tx.set(ref, { hits: hits + credits, resetAt: Timestamp.fromMillis(resetAt) });
      return { credits, resetAt };
    });
  }
}
export const firebaseStore = new FirebaseStore(getFirebaseAdminFirestore, paymentCollectionPrefix);
