// Bir kutuya/satıra dokununca ilgili işlemleri filtreli açar (ör. "Market & Gıda" → bu ayın market harcamaları)
import { useBudget } from '../context/BudgetContext';
import { setActiveTab } from './activeTab';

export interface DrillFilter {
  type?: 'income' | 'expense' | 'saving';
  category?: string;
  member?: string;
  query?: string;
}

export function useDrill() {
  const { setFilterQuery, setFilterCategory, setFilterMember, setFilterType, setFilterDateRange } = useBudget();
  return (f: DrillFilter = {}) => {
    setFilterType(f.type ?? 'all');
    setFilterCategory(f.category ?? 'all');
    setFilterMember(f.member ?? 'all');
    setFilterQuery(f.query ?? '');
    // Özet'te seçili ay ile aynı dönem
    setFilterDateRange('this_month');
    setActiveTab('transactions');
  };
}
