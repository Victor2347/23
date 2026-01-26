import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomerService } from './services/customer.service';
import { Customer } from './models/customer.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private customerService = inject(CustomerService);

  // 搜尋
  searchQuery = signal('');
  searchResults = signal<Customer[]>([]);
  isSearching = signal(false);

  // 新增表單
  showAddForm = signal(false);
  newCustomer = signal<Omit<Customer, 'id' | 'created_at'>>({
    customer_code: '',
    recipient: '',
    address: '',
    tax_id: '',
    notes: '',
  });

  // 匯入
  isImporting = signal(false);
  importResult = signal('');

  // 訊息
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');

  // 所有客戶
  allCustomers = signal<Customer[]>([]);
  showAllCustomers = signal(false);

  ngOnInit() {
    this.loadAllCustomers();
  }

  async loadAllCustomers() {
    try {
      const customers = await this.customerService.getAllCustomers();
      this.allCustomers.set(customers);
    } catch (error) {
      this.showMessage('載入資料失敗', 'error');
    }
  }

  async onSearch() {
    const query = this.searchQuery().trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);
    try {
      const results = await this.customerService.searchCustomers(query);
      this.searchResults.set(results);
      if (results.length === 0) {
        this.showMessage('找不到符合的客戶', 'error');
      }
    } catch (error) {
      this.showMessage('搜尋失敗，請檢查網路連線', 'error');
    } finally {
      this.isSearching.set(false);
    }
  }

  onSearchInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    // 即時搜尋（debounce 效果可自行加入）
    if (input.value.trim().length >= 2) {
      this.onSearch();
    } else if (input.value.trim().length === 0) {
      this.searchResults.set([]);
    }
  }

  toggleAddForm() {
    this.showAddForm.set(!this.showAddForm());
    if (!this.showAddForm()) {
      this.resetNewCustomer();
    }
  }

  resetNewCustomer() {
    this.newCustomer.set({
      customer_code: '',
      recipient: '',
      address: '',
      tax_id: '',
      notes: '',
    });
  }

  updateNewCustomer(field: keyof Omit<Customer, 'id' | 'created_at'>, event: Event) {
    const input = event.target as HTMLInputElement;
    this.newCustomer.update((c) => ({ ...c, [field]: input.value }));
  }

  async addCustomer() {
    const customer = this.newCustomer();
    
    // 驗證：收貨人、地址必填；客戶代碼和統編至少要填一個
    if (!customer.recipient || !customer.address) {
      this.showMessage('請填寫收貨人、地址', 'error');
      return;
    }
    
    if (!customer.customer_code && !customer.tax_id) {
      this.showMessage('請填寫客戶代碼或統編（至少填一個）', 'error');
      return;
    }

    try {
      // 如果有填客戶代碼，檢查是否已存在
      if (customer.customer_code) {
        const exists = await this.customerService.checkCustomerCodeExists(customer.customer_code);
        if (exists) {
          this.showMessage(`客戶代碼「${customer.customer_code}」已存在！`, 'error');
          return;
        }
      }

      // 如果沒填客戶代碼但有統編，用統編當客戶代碼
      const customerToAdd = { ...customer };
      if (!customerToAdd.customer_code && customerToAdd.tax_id) {
        customerToAdd.customer_code = customerToAdd.tax_id;
      }

      await this.customerService.addCustomer(customerToAdd);
      this.showMessage('新增成功！', 'success');
      this.resetNewCustomer();
      this.showAddForm.set(false);
      this.loadAllCustomers();
    } catch (error) {
      this.showMessage('新增失敗', 'error');
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    this.importResult.set('');

    try {
      const data = await this.readExcelFile(file);
      if (data.length === 0) {
        this.showMessage('檔案內容為空或格式錯誤', 'error');
        return;
      }

      // 檢查檔案內是否有重複的客戶代碼
      const codes = data.map((c) => c.customer_code);
      const duplicatesInFile = codes.filter((code, index) => codes.indexOf(code) !== index);
      if (duplicatesInFile.length > 0) {
        const uniqueDuplicates = [...new Set(duplicatesInFile)];
        this.showMessage(`檔案內有重複的客戶代碼：${uniqueDuplicates.join(', ')}`, 'error');
        return;
      }

      // 檢查資料庫中是否已存在這些客戶代碼
      const existingCodes = await this.customerService.checkCustomerCodesExist(codes);
      if (existingCodes.length > 0) {
        this.showMessage(`以下客戶代碼已存在：${existingCodes.join(', ')}`, 'error');
        return;
      }

      const count = await this.customerService.importCustomers(data);
      this.showMessage(`成功匯入 ${count} 筆資料！`, 'success');
      this.loadAllCustomers();
    } catch (error) {
      this.showMessage('匯入失敗，請檢查檔案格式', 'error');
    } finally {
      this.isImporting.set(false);
      input.value = '';
    }
  }

  private readExcelFile(file: File): Promise<Omit<Customer, 'id' | 'created_at'>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const customers: Omit<Customer, 'id' | 'created_at'>[] = jsonData.map((row: any) => {
            const customer_code = String(row['客戶代碼'] || row['customer_code'] || '');
            const tax_id = String(row['統編'] || row['tax_id'] || '');
            return {
              // 如果沒有客戶代碼但有統編，用統編當客戶代碼
              customer_code: customer_code || tax_id,
              recipient: String(row['收貨人'] || row['recipient'] || ''),
              address: String(row['地址'] || row['address'] || ''),
              tax_id: tax_id,
              notes: String(row['備註'] || row['notes'] || row['電話'] || row['phone'] || ''),
            };
          });

          // 過濾掉空的資料（收貨人、地址必填，客戶代碼或統編至少要有一個）
          const validCustomers = customers.filter(
            (c) => c.recipient && c.address && (c.customer_code || c.tax_id)
          );

          resolve(validCustomers);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  async deleteCustomer(id: number) {
    if (!confirm('確定要刪除此客戶？')) return;

    try {
      await this.customerService.deleteCustomer(id);
      this.showMessage('刪除成功', 'success');
      this.loadAllCustomers();
      // 如果有搜尋結果，也更新
      if (this.searchResults().length > 0) {
        this.searchResults.update((results) => results.filter((c) => c.id !== id));
      }
    } catch (error) {
      this.showMessage('刪除失敗', 'error');
    }
  }

  toggleAllCustomers() {
    this.showAllCustomers.set(!this.showAllCustomers());
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('已複製客戶代碼', 'success');
    });
  }

  private showMessage(msg: string, type: 'success' | 'error') {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => {
      this.message.set('');
      this.messageType.set('');
    }, 3000);
  }
}
