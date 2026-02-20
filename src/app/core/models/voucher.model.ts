export type VoucherStatus = 'PENDING' | 'ANALYZED' | 'CORRECTED' | 'REJECTED';

export interface Voucher {
  id: string;
  payer: string;
  payee: string;
  amount: number;
  currency: string;
  paymentDate: string;
  description: string;
  referenceNumber: string;
  bankName: string;
  status: VoucherStatus;
  rawFilePath: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherFilters {
  payer?: string;
  payee?: string;
  bankName?: string;
  referenceNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: VoucherStatus;
  page?: number;
  limit?: number;
}

export interface VoucherInsights {
  total: number;
  byStatus: { status: string; count: string }[];
  amounts: {
    total: string;
    average: string;
    max: string;
    min: string;
  };
  byBank: { bank: string; count: string; total: string }[];
}


export interface ExtractedVoucherData {
  payer:             string;
  payee:             string;
  amount:            string;
  currency:          string;
  payment_date:      string;
  description:       string;
  reference_number:  string;
  bank_name:         string;
  confidence_score:  number;
  raw_text?:         string;
}

export interface ExtractOnlyResponse {
  extracted:  ExtractedVoucherData;  
  fileBase64: string;
  fileMime:   string;
  fileName:   string;
}