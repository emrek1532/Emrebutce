import React from 'react';
import { useBudget } from '../../context/BudgetContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../data/initialData';
import { Search, Filter, RotateCcw } from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    filterQuery,
    setFilterQuery,
    filterCategory,
    setFilterCategory,
    filterMember,
    setFilterMember,
    filterType,
    setFilterType,
    filterDateRange,
    setFilterDateRange,
    familyMembers,
    filteredTransactions
  } = useBudget();

  const allCategories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));

  const hasActiveFilters =
    filterQuery.trim() !== '' ||
    filterCategory !== 'all' ||
    filterMember !== 'all' ||
    filterType !== 'all' ||
    filterDateRange !== 'this_month';

  const resetFilters = () => {
    setFilterQuery('');
    setFilterCategory('all');
    setFilterMember('all');
    setFilterType('all');
    setFilterDateRange('this_month');
  };

  return (
    <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
      {/* Top Search & Filter Count Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Açıklama, kategori, aile üyesi veya ödeme şekli ara..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <strong className="text-neutral-900 dark:text-neutral-100 font-bold">
              {filteredTransactions.length}
            </strong>{' '}
            kayıt
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-neutral-400" />
              <span>Filtreleri Sıfırla</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        {/* Date Range */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Dönem
          </label>
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value as any)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="this_month">Bu Ay</option>
            <option value="last_month">Geçen Ay</option>
            <option value="last_3_months">Son 3 Ay</option>
            <option value="this_year">Bu Yıl</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            İşlem Türü
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tümü (Gelir + Gider)</option>
            <option value="expense">Yalnızca Giderler</option>
            <option value="income">Yalnızca Gelirler</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Kategori
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Member Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Aile Üyesi
          </label>
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
          >
            <option value="all">Tüm Aile</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
