import React, { useState, useMemo } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatCurrency } from '../../utils/currencies';
import {
  Sparkles,
  TrendingUp,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface MonthProjection {
  key: string;
  name: string;
  eminevim: number;
  arkadas: number;
  bankalar: number;
  income: number;
  totalExpense: number;
  netMonthly: number;
  cumulativeSavings: number;
}

export const SimulatorView: React.FC = () => {
  const { monthlyIncome, currency } = useBudget();

  // Simulation controls
  const [salaryIncreasePercent, setSalaryIncreasePercent] = useState<number>(0);
  const [expenseCutPercent, setExpenseCutPercent] = useState<number>(0);
  const [extraMonthlySavings, setExtraMonthlySavings] = useState<number>(0);

  // 24 Months projection calculation
  const projection = useMemo(() => {
    const list: MonthProjection[] = [];
    const baseIncome = 114250 * (1 + salaryIncreasePercent / 100);
    const baseLivingExpense = (16500 + 4500 + 2200) * (1 - expenseCutPercent / 100); // Kira + market + fatura
    const sirketBorc = 10000;

    let cumulativeSavings = 0;

    // Timeline of installment amounts by month key
    const months = [
      { key: '2026-10', name: 'Ekim 2026', eminevim: 17400 + 5250, arkadas: 10929.19, bankalar: 11770.44 },
      { key: '2026-11', name: 'Kasım 2026', eminevim: 18600 + 5250, arkadas: 10929.19, bankalar: 11770.44 },
      { key: '2026-12', name: 'Aralık 2026', eminevim: 21600, arkadas: 10929.19, bankalar: 11770.44 },
      { key: '2027-01', name: 'Ocak 2027', eminevim: 24000, arkadas: 10039.58, bankalar: 11770.44 }, // Ek kasko 1 bitti
      { key: '2027-02', name: 'Şubat 2027', eminevim: 25800, arkadas: 6206.25, bankalar: 11770.44 }, // Motor bitti
      { key: '2027-03', name: 'Mart 2027', eminevim: 30600, arkadas: 6206.25, bankalar: 11770.44 },
      { key: '2027-04', name: 'Nisan 2027', eminevim: 34200, arkadas: 2599.20, bankalar: 11770.44 }, // Sigorta & ek kasko 2 bitti
      { key: '2027-05', name: 'Mayıs 2027', eminevim: 40800, arkadas: 2599.20, bankalar: 11770.44 },
      { key: '2027-06', name: 'Haziran 2027', eminevim: 40200, arkadas: 2599.20, bankalar: 11770.44 },
      { key: '2027-07', name: 'Temmuz 2027', eminevim: 37800, arkadas: 0, bankalar: 11770.44 }, // Arkadaş kartı tamamen sıfırlandı!
      { key: '2027-08', name: 'Ağustos 2027', eminevim: 33000, arkadas: 0, bankalar: 11770.44 },
      { key: '2027-09', name: 'Eylül 2027', eminevim: 31200, arkadas: 0, bankalar: 11770.44 },
      { key: '2027-10', name: 'Ekim 2027', eminevim: 29400, arkadas: 0, bankalar: 11770.44 },
      { key: '2027-11', name: 'Kasım 2027', eminevim: 27600, arkadas: 0, bankalar: 11770.44 },
      { key: '2027-12', name: 'Aralık 2027', eminevim: 25800, arkadas: 0, bankalar: 11770.44 },
      { key: '2028-01', name: 'Ocak 2028', eminevim: 24000, arkadas: 0, bankalar: 8731.15 }, // Eşimin enpara bitti (-3039 TL)
      { key: '2028-02', name: 'Şubat 2028', eminevim: 22200, arkadas: 0, bankalar: 8731.15 },
      { key: '2028-03', name: 'Mart 2028', eminevim: 19200, arkadas: 0, bankalar: 8731.15 },
      { key: '2028-04', name: 'Nisan 2028', eminevim: 17400, arkadas: 0, bankalar: 0 }, // İşbank ve enpara sıfırlandı!
      { key: '2028-05', name: 'Mayıs 2028', eminevim: 14400, arkadas: 0, bankalar: 0 },
      { key: '2028-06', name: 'Haziran 2028', eminevim: 13200, arkadas: 0, bankalar: 0 },
      { key: '2028-07', name: 'Temmuz 2028', eminevim: 12600, arkadas: 0, bankalar: 0 },
      { key: '2028-08', name: 'Ağustos 2028', eminevim: 11999.40, arkadas: 0, bankalar: 0 } // Eminevim bitti!
    ];

    months.forEach((m) => {
      const totalExpense = baseLivingExpense + sirketBorc + m.eminevim + m.arkadas + m.bankalar;
      const netMonthly = baseIncome - totalExpense + extraMonthlySavings;
      cumulativeSavings += Math.max(0, netMonthly);

      list.push({
        ...m,
        income: baseIncome,
        totalExpense,
        netMonthly,
        cumulativeSavings
      });
    });

    return list;
  }, [salaryIncreasePercent, expenseCutPercent, extraMonthlySavings]);

  const maxNet = Math.max(...projection.map((p) => p.netMonthly), 60000);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Akıllı Bütçe Simülatörü & 24 Aylık Gelecek Nakit Projeksiyonu</span>
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Taksitleriniz kapandıkça ve maaş artışlarında aile bütçenizin aydan aya nasıl ferahlayacağını canlı simüle edin.
        </p>
      </div>

      {/* Simulator Sliders Card */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-500" />
          <span>Simülasyon Değişkenleri ("Ya Şöyle Olursa?")</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Salary increase */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Maaş Artışı / Prim
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +%{salaryIncreasePercent} ({formatCurrency(114250 * (salaryIncreasePercent / 100), currency)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={salaryIncreasePercent}
              onChange={(e) => setSalaryIncreasePercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[11px] text-neutral-400 block">
              Mevcut toplam hane geliri: 114.250 ₺
            </span>
          </div>

          {/* Slider 2: Living Expense cut */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Gider Tasarrufu (Market/Yaşam)
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                -%{expenseCutPercent}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="5"
              value={expenseCutPercent}
              onChange={(e) => setExpenseCutPercent(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-[11px] text-neutral-400 block">
              Market, fatura ve günlük harcamaları optimize etme
            </span>
          </div>

          {/* Slider 3: Extra Monthly contribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Ekstra Ek Gelir / Tasarruf
              </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                +{formatCurrency(extraMonthlySavings, currency)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25000"
              step="1000"
              value={extraMonthlySavings}
              onChange={(e) => setExtraMonthlySavings(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <span className="text-[11px] text-neutral-400 block">
              Aylık serbest ek nakit desteği
            </span>
          </div>
        </div>
      </div>

      {/* Projection Chart & Highlights */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Aylık Net Bakiye ve Tasarruf Gücü Eğrisi (2026 - 2028)
            </h3>
            <span className="text-xs text-neutral-400">
              Taksitler kapandıkça elinizde kalan aylık net nakit (Yeşil barlar)
            </span>
          </div>
        </div>

        {/* Bar chart */}
        <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
          {projection.map((item, idx) => {
            const h = Math.max(8, Math.min(100, (item.netMonthly / maxNet) * 100));
            const isHighlight = item.key === '2027-01' || item.key === '2027-07' || item.key === '2028-04';

            return (
              <div
                key={item.key}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 pointer-events-none z-30 bg-neutral-900 text-white rounded-lg p-2.5 shadow-xl text-xs whitespace-nowrap font-mono">
                  <p className="font-bold text-neutral-200 mb-1">{item.name}</p>
                  <p className="text-emerald-400">Net Kalan: +{formatCurrency(item.netMonthly, currency)}</p>
                  <p className="text-neutral-400">Toplam Gider: {formatCurrency(item.totalExpense, currency)}</p>
                  <p className="text-blue-300">Biriken Varlık: {formatCurrency(item.cumulativeSavings, currency)}</p>
                </div>

                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isHighlight
                      ? 'bg-emerald-500 group-hover:bg-emerald-400'
                      : 'bg-emerald-600/70 group-hover:bg-emerald-500'
                  }`}
                  style={{ height: `${h}%` }}
                />

                <span className="text-[9px] text-neutral-400 font-mono mt-1 rotate-45 sm:rotate-0 origin-left">
                  {idx % 3 === 0 ? item.name.split(' ')[0].slice(0, 3) : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Milestone Callouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            <span className="font-bold text-neutral-900 dark:text-neutral-100 block mb-0.5">
              1. Aşama: 2027 Yazı
            </span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Arkadaş kartı borçlarının tamamı (10.929 TL/ay) sıfırlanmış olur.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            <span className="font-bold text-neutral-900 dark:text-neutral-100 block mb-0.5">
              2. Aşama: Mart 2028
            </span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              İşbank ve Enpara kredileri tamamen biter; bütçede her ay net <strong>+8.731 TL</strong> fazladan kalır!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
            <span className="font-bold text-neutral-900 dark:text-neutral-100 block mb-0.5">
              3. Aşama: Ağustos 2028
            </span>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Eminevim'in son 25. taksiti ödenir; hane borçsuz bir şekilde konut/araç sahibi olur!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
