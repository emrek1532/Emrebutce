import React, { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { InstallmentDebt } from '../../types/budget';
import { formatCurrency, convertCurrency } from '../../utils/currencies';
import {
  CreditCard,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';

export const InstallmentsView: React.FC = () => {
  const { installments, currency, markInstallmentPaid } = useBudget();
  const [expandedEminevim, setExpandedEminevim] = useState(true);

  // Calculate monthly total installment load
  let totalMonthlyInstallment = 0;
  installments.forEach((inst) => {
    totalMonthlyInstallment += convertCurrency(inst.monthlyAmount, 'TRY', currency);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Kredi Kartı, Yapılandırma & Taksit Takip Matrisi</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Mevcut banka yapılandırmaları, Eminevim taksitleri ve arkadaş kartı ödemelerinizin tam listesi.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Aylık Toplam Taksit Yükü
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
            {formatCurrency(totalMonthlyInstallment, currency)}
          </span>
        </div>
      </div>

      {/* Debt Relief Milestone Timeline (Hangi borç ne zaman bitiyor?) */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
            Borç Bitiş & Bütçe Rahatlama Takvimi
          </h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Taksitleriniz bittikçe aylık bütçenizde açılacak net nakit rahatlamaları:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Milestone 1: Aralık 2026 */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Aralık 2026 (2 Ay Sonra)
            </span>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Ek Kasko 1 Bitiyor
            </h4>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              +889,61 ₺ / ay
            </span>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Ayrıca Eminevim 5.250 ₺ masrafı Kasım'da son buluyor!
            </span>
          </div>

          {/* Milestone 2: Ocak 2027 */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Ocak 2027 (3 Ay Sonra)
            </span>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Motor Ekipmanı Bitiyor
            </h4>
            <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 block">
              +3.833,33 ₺ / ay
            </span>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Arkadaş kartındaki en büyük kalem kapanıyor.
            </span>
          </div>

          {/* Milestone 3: Mart & Haziran 2027 */}
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
              Mart - Haziran 2027
            </span>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Sigorta & Kasko Bitiyor
            </h4>
            <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 block">
              +6.206,25 ₺ / ay
            </span>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Arkadaş kartı borçları tamamen sıfırlanıyor!
            </span>
          </div>

          {/* Milestone 4: Mart 2028 */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
              Mart 2028 (Büyük Rahatlama)
            </span>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              İşbank & Enpara Sıfırlanıyor
            </h4>
            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
              +8.731,15 ₺ / ay
            </span>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Tüm banka yapılandırmaları tamamen kapanmış olacak.
            </span>
          </div>
        </div>
      </div>

      {/* Eminevim Special Payment Schedule Card */}
      {installments.find((i) => i.id === 'inst-eminevim-taksit') && (
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Eminevim Konut / Araç Ödeme Çizelgesi
                </h3>
                <span className="text-xs text-neutral-500 font-mono">
                  Toplam Kalan: 555.599,40 TL · Toplam Ödenen: 44.400,60 TL (Bu ay 17.400 ₺ taksit + 5.250 ₺ masraf ödendi)
                </span>
              </div>
            </div>

            <button
              onClick={() => setExpandedEminevim(!expandedEminevim)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors self-start sm:self-auto"
            >
              <span>{expandedEminevim ? 'Tabloyu Gizle' : 'Tüm 22 Taksiti Göster'}</span>
              {expandedEminevim ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {expandedEminevim && (
            <div className="overflow-x-auto border rounded-xl border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 font-semibold border-b border-neutral-200 dark:border-neutral-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Tarih</th>
                    <th className="py-2.5 px-3">Tür / Dönem</th>
                    <th className="py-2.5 px-3 text-right">Taksit Tutarı</th>
                    <th className="py-2.5 px-3 text-center">Durum</th>
                    <th className="py-2.5 px-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono tabular-nums">
                  {/* Masraf Taksiti Özel Satır */}
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">12.11.2026</td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-amber-800 dark:text-amber-300">
                      Organizasyon Masrafı (Son 1 Taksit)
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700 dark:text-amber-400">
                      5.250,00 ₺
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Gelecek Ay Son Masraf
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span className="text-[11px] text-neutral-400">1/2 Ödendi</span>
                    </td>
                  </tr>

                  {/* 23 Taksit Dönemleri (Görseldeki tam liste) */}
                  {installments.find((i) => i.id === 'inst-eminevim-taksit')?.schedule?.map((item) => (
                    <tr
                      key={item.period}
                      className={item.paid ? 'bg-emerald-50/50 dark:bg-emerald-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}
                    >
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          Dönem {item.period}
                        </span>
                        {item.period === 3 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium ml-2">
                            (Bu Ay Ödendi)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(item.amount, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {item.paid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ödendi</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            Ödenecek
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        {!item.paid && (
                          <button
                            onClick={() => markInstallmentPaid('inst-eminevim-taksit', item.period)}
                            className="px-2 py-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded transition-colors"
                          >
                            Ödendi İşaretle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Structured Bank & Friend Installments Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>Banka Yapılandırmaları & Kredi Taksitleri</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {installments
            .filter((i) => i.id !== 'inst-eminevim-taksit')
            .map((inst) => {
              const isArkadas = inst.creditor === 'Arkadaş Kartı';
              const isBank = inst.creditor === 'İş Bankası' || inst.creditor === 'Enpara';
              const isSirket = inst.creditor === 'Şirket';

              return (
                <div
                  key={inst.id}
                  className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isArkadas
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                          : isBank
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {inst.creditor}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Her Ayın {inst.paymentDayOfMonth}'si
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
                      {inst.title}
                    </h4>

                    {inst.notes && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        {inst.notes}
                      </p>
                    )}

                    {inst.totalInstallments && (
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-400">Taksit Durumu:</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {inst.paidInstallments} / {inst.totalInstallments} Ödendi
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${((inst.paidInstallments || 0) / inst.totalInstallments) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase">Aylık Taksit</span>
                      <span className="text-base font-bold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(inst.monthlyAmount, currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block uppercase">Bitiş</span>
                      <span className="text-xs font-semibold font-mono text-neutral-700 dark:text-neutral-300">
                        {inst.endDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
