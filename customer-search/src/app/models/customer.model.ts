export interface Customer {
  id?: number;
  customer_code: string;    // 客戶代碼
  recipient: string;        // 收貨人
  address: string;          // 地址
  tax_id: string;           // 統編
  notes: string;            // 備註（可存電話等）
  created_at?: string;
}

