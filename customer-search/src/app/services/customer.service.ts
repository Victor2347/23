import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Customer } from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private supabaseService = inject(SupabaseService);
  private tableName = 'customers';

  // 搜尋客戶（by 地址或收貨人）
  async searchCustomers(query: string): Promise<Customer[]> {
    const supabase = this.supabaseService.getClient();
    const searchTerm = `%${query}%`;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`address.ilike.${searchTerm},recipient.ilike.${searchTerm}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('搜尋錯誤:', error);
      throw error;
    }

    return data || [];
  }

  // 取得所有客戶
  async getAllCustomers(): Promise<Customer[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('取得資料錯誤:', error);
      throw error;
    }

    return data || [];
  }

  // 檢查客戶代碼是否已存在
  async checkCustomerCodeExists(customerCode: string): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('id')
      .eq('customer_code', customerCode)
      .limit(1);

    if (error) {
      console.error('檢查客戶代碼錯誤:', error);
      throw error;
    }

    return (data?.length || 0) > 0;
  }

  // 批次檢查客戶代碼是否已存在（回傳已存在的代碼）
  async checkCustomerCodesExist(customerCodes: string[]): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('customer_code')
      .in('customer_code', customerCodes);

    if (error) {
      console.error('批次檢查客戶代碼錯誤:', error);
      throw error;
    }

    return data?.map((d) => d.customer_code) || [];
  }

  // 新增客戶
  async addCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert([customer])
      .select()
      .single();

    if (error) {
      console.error('新增錯誤:', error);
      throw error;
    }

    return data;
  }

  // 批次匯入客戶
  async importCustomers(customers: Omit<Customer, 'id' | 'created_at'>[]): Promise<number> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(customers)
      .select();

    if (error) {
      console.error('匯入錯誤:', error);
      throw error;
    }

    return data?.length || 0;
  }

  // 刪除客戶
  async deleteCustomer(id: number): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error('刪除錯誤:', error);
      throw error;
    }
  }

  // 更新客戶
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新錯誤:', error);
      throw error;
    }

    return data;
  }
}

