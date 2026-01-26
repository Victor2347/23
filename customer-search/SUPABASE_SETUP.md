# Supabase 設定指南

## 1. 建立資料表

在 Supabase 的 SQL Editor 執行以下 SQL：

```sql
-- 建立 customers 資料表
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  customer_code VARCHAR(100) NOT NULL,
  recipient VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  tax_id VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立搜尋索引（提升搜尋效能）
CREATE INDEX idx_customers_recipient ON customers USING gin(to_tsvector('simple', recipient));
CREATE INDEX idx_customers_address ON customers USING gin(to_tsvector('simple', address));
CREATE INDEX idx_customers_code ON customers(customer_code);

-- 開啟 RLS（Row Level Security）
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 建立允許所有操作的 Policy（開發用，正式環境請調整）
CREATE POLICY "Allow all operations" ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 如果你已經有資料表，只需新增 notes 欄位：

```sql
ALTER TABLE customers ADD COLUMN notes TEXT;
```

## 2. 取得 API 金鑰

1. 登入 Supabase Dashboard
2. 進入你的專案
3. 點擊左側「Project Settings」→「API」
4. 複製：
   - **Project URL** → 填入 `supabaseUrl`
   - **anon public** → 填入 `supabaseAnonKey`

## 3. 設定環境變數

編輯 `src/environments/environment.ts`：

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://你的專案.supabase.co',
  supabaseAnonKey: '你的anon-key',
};
```

## 4. 啟動專案

```bash
cd customer-search
npm start
```

瀏覽器開啟 http://localhost:4200

## Excel 匯入格式

| 客戶代碼 | 收貨人 | 地址 | 統編 | 備註 |
|---------|--------|------|------|------|
| C001 | 王小明 | 台北市信義區... | 12345678 | 0912-345-678 |
|  | 李小華 | 新北市板橋區... | 87654321 | 週一~五配送 |

💡 **客戶代碼與統編至少填一個**，若只填統編則系統會自動以統編作為客戶代碼。

欄位名稱可用中文或英文：
- `客戶代碼` 或 `customer_code`
- `收貨人` 或 `recipient`
- `地址` 或 `address`
- `統編` 或 `tax_id`
- `備註` 或 `notes` 或 `電話` 或 `phone`

