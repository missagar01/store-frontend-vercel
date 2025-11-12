// src/lib/filter.ts
import type { IndentSheet, ReceivedSheet } from '@/types';

type Filters = {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  vendors?: string[];
  products?: string[];
};

// chhota helper: undefined → '' → lowercase
const toLow = (v: unknown) => (v ?? '').toString().toLowerCase();

export function analyzeData(
  {
    indentSheet,
    receivedSheet,
  }: {
    indentSheet: IndentSheet[] | undefined;
    receivedSheet: ReceivedSheet[] | undefined;
  },
  filters: Filters = {}
) {
  // agar kuch nahi aaya to empty array
  const safeIndent: IndentSheet[] = Array.isArray(indentSheet) ? indentSheet : [];
  const safeReceived: ReceivedSheet[] = Array.isArray(receivedSheet) ? receivedSheet : [];

  const start = filters.startDate ? new Date(filters.startDate) : null;
  const end = filters.endDate ? new Date(filters.endDate) : null;

  const vendorSet = new Set(filters.vendors ?? []);
  const productSet = new Set(filters.products ?? []);

  const isWithinDate = (dateStr: string | undefined) => {
    if (!dateStr) return true; // agar row me timestamp hi nahi hai to usko allow kar do
    const d = new Date(dateStr);
    if (d.toString() === 'Invalid Date') return true;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const isVendorMatch = (name: string | undefined) =>
    vendorSet.size === 0 || (name && vendorSet.has(name));

  const isProductMatch = (name: string | undefined) =>
    productSet.size === 0 || (name && productSet.has(name));

  // Map from indentNumber to productName
  const indentProductMap = new Map<string, string>();
  for (const indent of safeIndent) {
    if (indent.indentNumber) {
      indentProductMap.set(indent.indentNumber, indent.productName ?? '');
    }
  }

  // -------------------------------
  // Approved Indents
  const approvedIndents = safeIndent.filter((i) => {
    const vendorType = toLow(i.vendorType);
    const okVendorType =
      vendorType === 'three party' || vendorType === 'regular' || vendorType === 'three-party';

    return (
      okVendorType &&
      isWithinDate(i.timestamp) &&
      isProductMatch(i.productName ?? '')
    );
  });

  const totalApprovedQuantity = approvedIndents.reduce((sum, i) => {
    const q = Number(i.approvedQuantity ?? 0);
    return sum + (isNaN(q) ? 0 : q);
  }, 0);

  // -------------------------------
  // Purchases
  const receivedPurchases = safeReceived.filter((r) => {
    const productName = r.indentNumber ? indentProductMap.get(r.indentNumber) : undefined;
    return (
      isWithinDate(r.timestamp) &&
      isVendorMatch(r.vendor) &&
      (!productName || isProductMatch(productName))
    );
  });

  const totalPurchasedQuantity = receivedPurchases.reduce((sum, r) => {
    const q = Number(r.receivedQuantity ?? 0);
    return sum + (isNaN(q) ? 0 : q);
  }, 0);

  // -------------------------------
  // Issued Items
  const issuedIndents = safeIndent.filter((i) => {
    const issueStatus = toLow(i.issueStatus);
    return (
      issueStatus === 'issued' &&
      isWithinDate(i.timestamp) &&
      isProductMatch(i.productName ?? '')
    );
  });

  const totalIssuedQuantity = issuedIndents.reduce((sum, i) => {
    const q = Number(i.issuedQuantity ?? 0);
    return sum + (isNaN(q) ? 0 : q);
  }, 0);

  // -------------------------------
  // Top 10 Products
  const productFrequencyMap = new Map<string, { freq: number; quantity: number }>();

  for (const r of safeReceived) {
    if (!isWithinDate(r.timestamp)) continue;
    const productName = r.indentNumber ? indentProductMap.get(r.indentNumber) : undefined;
    if (!productName || !isProductMatch(productName)) continue;

    if (!productFrequencyMap.has(productName)) {
      productFrequencyMap.set(productName, { freq: 0, quantity: 0 });
    }
    const entry = productFrequencyMap.get(productName)!;
    entry.freq += 1;
    entry.quantity += Number(r.receivedQuantity ?? 0);
  }

  const topProducts = [...productFrequencyMap.entries()]
    .sort((a, b) => b[1].freq - a[1].freq)
    .slice(0, 10)
    .map(([name, data]) => ({ name, ...data }));

  // -------------------------------
  // Top 10 Vendors
  const vendorMap = new Map<string, { orders: number; quantity: number }>();

  for (const r of safeReceived) {
    if (!isWithinDate(r.timestamp)) continue;
    if (!isVendorMatch(r.vendor)) continue;

    const vendorName = r.vendor ?? 'Unknown';
    if (!vendorMap.has(vendorName)) {
      vendorMap.set(vendorName, { orders: 0, quantity: 0 });
    }
    const entry = vendorMap.get(vendorName)!;
    entry.orders += 1;
    entry.quantity += Number(r.receivedQuantity ?? 0);
  }

  const topVendors = [...vendorMap.entries()]
    .sort((a, b) => b[1].orders - a[1].orders)
    .slice(0, 10)
    .map(([name, data]) => ({ name, ...data }));

  // -------------------------------
  return {
    approvedIndentCount: approvedIndents.length,
    totalApprovedQuantity,
    receivedPurchaseCount: receivedPurchases.length,
    totalPurchasedQuantity,
    issuedIndentCount: issuedIndents.length,
    totalIssuedQuantity,
    topProducts,
    topVendors,
  };
}
