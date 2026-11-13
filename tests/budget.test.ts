import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minimumPaymentOf, minimumRateOf, periodSpendOf, lastStatementKey } from '../src/utils/cardStatement';
import { budgetMonthOf, isCashExpense, shiftMonthKey } from '../src/utils/budgetMonth';
import { simulate } from '../src/utils/debtPlan';

test('asgari ödeme: limit 100 binin altında %20, üstünde %40', () => {
  const card: any = { limit: 17500, currentDebt: 14415.64, statementDebt: 14415.64, statementTotal: 14415.64 };
  assert.equal(minimumRateOf(card), 0.2);
  assert.equal(minimumPaymentOf(card), 2883.13);
  assert.equal(minimumRateOf({ ...card, limit: 150000 }), 0.4);
  // Ekstrenin bir kısmı ödenince kalan asgari azalır
  assert.equal(minimumPaymentOf({ ...card, statementDebt: 12415.64 }), 883.13);
  assert.equal(periodSpendOf({ ...card, currentDebt: 15515.64 }), 1100);
});

test('ekstre ayı kesim gününe göre', () => {
  assert.equal(lastStatementKey({ statementDay: 27 }, new Date(2026, 10, 4)), '2026-10');
  assert.equal(lastStatementKey({ statementDay: 3 }, new Date(2026, 10, 4)), '2026-11');
});

test('bütçe ayı ve nakit gider kuralı', () => {
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(budgetMonthOf({ date: '2026-10-30', budgetMonth: '2026-11' }), '2026-11');
  assert.equal(isCashExpense({ type: 'expense', paymentMethod: 'Kredi Kartı' } as any), false);
  // Borçlar'dan "Bu ayı öde" ile ödenen taksit, yöntemi Kredi Kartı görünse de hesaptan çıkan paradır
  assert.equal(isCashExpense({ type: 'expense', paymentMethod: 'Kredi Kartı', installmentInfo: { installmentId: 'x' } } as any), true);
  assert.equal(isCashExpense({ type: 'expense', paymentMethod: 'Nakit' } as any), true);
});

test('borç planı: fazladan ödeme borçsuz kalmayı öne çeker', () => {
  const debts = [
    { id: 'a', title: 'A', balance: 3000, monthly: 1000, start: 0 },
    { id: 'b', title: 'B', balance: 12000, monthly: 1000, start: 0 }
  ];
  const base = simulate(debts, 0);
  const plan = simulate(debts, 1000);
  assert.equal(base.months, 12);
  assert.ok(plan.months < base.months);
  assert.equal(Math.round(base.totalPaid), 15000);
});

test('borç planı: faizli kredide erken kapatma faiz kazandırır', () => {
  const debts = [{ id: 'k', title: 'Kredi', balance: 24 * 1000, monthly: 1000, start: 0, rate: 0.03, count: 24 }];
  const base = simulate(debts, 0);
  const plan = simulate(debts, 1000);
  assert.ok(Math.abs(base.totalPaid - 24000) < 1);
  assert.ok(plan.totalPaid < base.totalPaid - 1000);
});

test('Bütçene sor: bu ay ödenmiş taksit "bu ay" toplamına girmez', async () => {
  const { buildAskItems, computeAnswer } = await import('../src/utils/askBudget');
  const now = new Date().toISOString().slice(0, 7);
  const inst = (id: string, amount: number) => ({
    id, title: id, creditor: 'Arkadaş Kartı', monthlyAmount: amount, totalInstallments: 6, paidInstallments: 1, remainingInstallments: 5,
    startDate: `${now}-01`, endDate: '2099-01-01', paymentDayOfMonth: 10, member: 'Emre', category: 'Borç & Kredi'
  });
  const items = buildAskItems('Bu ay arkadaş kartlarına ne kadar ödeyeceğim?', {
    installments: [inst('a', 1000), inst('b', 500)] as any,
    creditCards: [],
    recurring: [],
    transactions: [{ id: 'x', type: 'expense', amount: 1000, currency: 'TRY', date: `${now}-05`, installmentInfo: { current: 2, total: 6, installmentId: 'a' } }] as any
  });
  const ans = computeAnswer(items, { ids: ['t:a', 't:b'], metric: 'buAy', intro: 'Bu ay' });
  assert.equal(ans.total, 500);
  assert.match(ans.note ?? '', /ödendi.*a/);
});

test('kart borcu ödemesi nakit gider ama harcama dağılımına girmez', async () => {
  const { isCardPayment, isSpending } = await import('../src/utils/budgetMonth');
  const pay = { type: 'expense', description: 'Denizbank Bonus kart borcu ödemesi', paymentMethod: 'Havale/EFT' } as any;
  const shop = { type: 'expense', description: 'Migros', paymentMethod: 'Kredi Kartı' } as any;
  assert.equal(isCardPayment(pay), true);
  assert.equal(isSpending(pay), false);
  assert.equal(isCashExpense(pay), true);
  assert.equal(isSpending(shop), true);
  assert.equal(isCashExpense(shop), false);
  // Kartla taksitli alışveriş (Borçlar'a bağlı değil) nakit sayılmaz
  assert.equal(isCashExpense({ ...shop, installmentInfo: { current: 1, total: 6 } }), false);
});


test('nakit akışı: kart taksiti alışverişte değil ekstre ödemesinde sayılır', () => {
  // Kartla taksitli alışveriş: taksit bilgisi var ama Borçlar'a bağlı değil (installmentId yok)
  const purchase = { type: 'expense', paymentMethod: 'Kredi Kartı', installmentInfo: { current: 1, total: 6 } } as any;
  const settlement = { type: 'expense', paymentMethod: 'Havale/EFT', description: 'Kart borcu ödemesi' } as any;
  assert.equal(isCashExpense(purchase), false);
  assert.equal(isCashExpense(settlement), true);
});

test('borç planı: sıfır ek ödeme biten borç taksitini yeniden dağıtmaz', () => {
  const debts = [
    { id: 'a', title: 'A', balance: 100, monthly: 100, start: 0 },
    { id: 'b', title: 'B', balance: 300, monthly: 100, start: 0 }
  ];
  assert.equal(simulate(debts, 0).months, 3);
  assert.equal(simulate(debts, 100).months, 2);
});
