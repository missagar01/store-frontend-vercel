export type Sheet = 'INDENT' | 'RECEIVED' | 'MASTER' | 'USER' | 'PO MASTER' | "INVENTORY";

export type IndentSheet = {
    timestamp: string;
    requestNumber: string;
    indentSeries: string;
    requesterName: string;
    department: string;
    division: string;
    itemCode: string;
    // groupHead: string;
    productName: string;
    requestQty: number;
    uom: string;
    specifications: string;
    make: string;
    // indentApprovedBy: string;
    purpose: string;
    costLocation: string;
    // indentType: string;
    // attachment: string;
    formType: string;
    planned1: string;
    actual1: string;
    timeDelay1: string;
    requestStatus: string;
    approvedQuantity: number;
    planned2: string;
    actual2: string;
    timeDelay2: string;
    vendorName1: string;
    rate1: number;
    paymentTerm1: string;
    vendorName2: string;
    rate2: number;
    paymentTerm2: string;
    vendorName3: string;
    rate3: number;
    paymentTerm3: string;
    vendorName4: string;
    rate4: number;
    paymentTerm4: string;
    vendorName5: string;
    rate5: number;
    paymentTerm5: string;
    vendorName6: string;
    rate6: number;
    paymentTerm6: string;
    vendorName7: string;
    rate7: number;
    paymentTerm7: string;
    vendorName8: string;
    rate8: number;
    paymentTerm8: string;
    vendorName9: string;
    rate9: number;
    paymentTerm9: string;
    vendorName10: string;
    rate10: number;
    paymentTerm10: string;
    vendorName11: string;
    rate11: number;
    paymentTerm11: string;
    vendorName12: string;
    rate12: number;
    paymentTerm12: string;
    vendorName13: string;
    rate13: number;
    paymentTerm13: string;
    vendorName14: string;
    rate14: number;
    paymentTerm14: string;
    vendorName15: string;
    rate15: number;
    paymentTerm15: string;
    comparisonSheet: string;
    planned3: string;
    actual3: string;
    timeDelay3: string;
    approvedVendorName: string;
    approvedRate: number;
    approvedPaymentTerm: string;
    approvedDate: string;
    planned4: string;
    actual4: string;
    timeDelay4: string;
    poNumber: string;
    poCopy: string;
    planned5: string;
    actual5: string;
    timeDelay5: string;
    receiveStatus: string;
    planned6: string;
    actual6: string;
    timeDelay6: string;
    issueApprovedBy: string;
    issueStatus: string;
    issuedQuantity: number;
    areaOfUse:string;
};

export type ReceivedSheet = {
    timestamp: string;
    indentNumber: string;
    poDate: string;
    poNumber: string;
    vendor: string;
    receivedStatus: string;
    receivedQuantity: number;
    uom: string;
    photoOfProduct: string;
    warrantyStatus: string;
    endDate: string;
    billStatus: string;
    billNumber: string;
    billAmount: number;
    photoOfBill: string;
    anyTransportations: string;
    transporterName: string;
    transportingAmount: number;
};

export type InventorySheet = {
  groupHead: string;
  itemName: string;
  uom: string;
  maxLevel: number;
  opening: number;
  individualRate: number;
  indented: number;
  approved: number;
  purchaseQuantity: number;
  outQuantity: number;
  current: number;
  totalPrice: number;
  colorCode: string;
};


export type PoMasterSheet = {
    timestamp: string;
    partyName: string;
    poNumber: string;
    internalCode: string;
    product: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    gst: number;
    discount: number;
    amount: number;
    totalPoAmount: number;
    preparedBy: string;
    approvedBy: string;
    pdf: string;
    quotationNumber: string;
    quotationDate: string;
    enquiryNumber: string;
    enquiryDate: string;
    term1: string;
    term2: string;
    term3: string;
    term4: string;
    term5: string;
    term6: string;
    term7: string;
    term8: string;
    term9: string;
    term10: string;
};

export type Vendor = {
    vendorName: string;
    gstin: string;
    address: string;
    email: string;
};

export type MasterSheet = {
    vendors: Vendor[];
    paymentTerms: string[];
    departments: string[];
    groupHeads: Record<string, string[]>; // category: items[]
    companyName: string;
    companyAddress: string;
    companyGstin: string;
    companyPhone: string;
    billingAddress: string;
    companyPan: string;
    destinationAddress: string;
    defaultTerms: string[];
};

export type UserPermissions = {
    rowIndex: number;
    username: string;
    password: string;
    name: string;

    administrate: boolean;
    createIndent: boolean;
    createPo: boolean;
    indentApprovalView: boolean;
    indentApprovalAction: boolean;
    updateVendorView: boolean;
    updateVendorAction: boolean;
    threePartyApprovalView: boolean;
    threePartyApprovalAction: boolean;
    receiveItemView: boolean;
    receiveItemAction: boolean;
    storeOutApprovalView: boolean;
    storeOutApprovalAction: boolean;
    pendingIndentsView: boolean;
    ordersView: boolean;
    userIndent: boolean; // User indent permission
};

export const allPermissionKeys = [
    "administrate",
    "createIndent",
    "createPo",
    "indentApprovalView",
    "indentApprovalAction",
    "updateVendorView",
    "updateVendorAction",
    "threePartyApprovalView",
    "threePartyApprovalAction",
    "receiveItemView",
    "receiveItemAction",
    "storeOutApprovalView",
    "storeOutApprovalAction",
    "pendingIndentsView",
    "ordersView",
    "userIndent",
] as const;
