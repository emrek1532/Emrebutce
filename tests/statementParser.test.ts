import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, parseStatementLines, parseStatementSummary } from '../src/utils/statementParser';

test('tutar: Türkçe ve İngilizce biçim', () => {
  assert.equal(parseAmount('1.213,86'), 1213.86);
  assert.equal(parseAmount('1,213.86'), 1213.86);
  assert.equal(parseAmount('900.00'), 900);
  assert.equal(parseAmount('27,601.17'), 27601.17);
});

// İş Bankası biçimi: İngilizce tutar, "-" harcama, "+" karta ödeme (örnek, uydurma satırlar)
const ISBANK = [
  'Hesap Kesim Tarihi: 05/11/2026',
  'Son Ödeme Tarihi: 16/11/2026',
  'Hesap Özeti Borcu: 12,345.67 TL',
  'Ödenmesi Gereken Asgari Tutar: 2,469.13 TL',
  'İŞLEM TARİHİ AÇIKLAMA TUTAR',
  '8.10.2026 ORNEK AVM(4/6 TK) 5,399.97 TL 900.00-',
  '6.10.2026 1234-567 HESAPTAN AKTARIM 1234 İNTERAKTİF 4,813.28+',
  '9.10.2026 A101 MAGAZA ISPARTA TR KAZANILAN MAXİPUAN:0,14 1,403.40-',
  '13.10.2026 TUTUN SHOP AFYON TR 1234**5678 125.00-',
  'Türkiye İş Bankası AŞ | www.isbank.com.tr'
];

test('İş Bankası ekstresi: satırlar ve işaret', () => {
  const rows = parseStatementLines(ISBANK);
  assert.equal(rows.length, 4);
  const [avm, pay, market, shop] = rows;
  assert.deepEqual([avm.amount, avm.likelyNotExpense, avm.description], [900, false, 'ORNEK AVM(4/6 TK)']);
  assert.deepEqual(avm.installment, { current: 4, total: 6 });
  assert.equal(pay.likelyNotExpense, true);
  assert.deepEqual([market.amount, market.likelyNotExpense, market.description], [1403.4, false, 'A101 MAGAZA ISPARTA']);
  assert.equal(shop.description, 'TUTUN SHOP AFYON');
});

test('İş Bankası ekstresi: özet', () => {
  const s = parseStatementSummary(ISBANK);
  assert.equal(s.statementDebt, 12345.67);
  assert.equal(s.minimumPayment, 2469.13);
  assert.equal(s.statementDate, '2026-11-05');
  assert.equal(s.dueDate, '2026-11-16');
});

test('Garanti biçimi bozulmadı: işaretsiz harcama, "+" ödeme', () => {
  const rows = parseStatementLines(['30 Eylül 2026 MIGROS ISPARTA 1.250,40', '2 Ekim 2026 ODEME 5.000,00 +']);
  assert.deepEqual(
    rows.map((r) => [r.amount, r.likelyNotExpense]),
    [
      [1250.4, false],
      [5000, true]
    ]
  );
});

test('kart: ekstredeki asgari ve gelecek taksitler limitten düşer', async () => {
  const { availableLimitOf, minimumPaymentOf } = await import('../src/utils/cardStatement');
  const rows = parseStatementLines(ISBANK);
  const future = rows.reduce((s, l) => s + (l.installment ? l.amount * (l.installment.total - l.installment.current) : 0), 0);
  assert.equal(future, 1800); // 4/6 → 2 taksit × 900
  const card = { id: 'c', bank: 'İş Bankası', name: 'Maximum', member: 'x', limit: 15000, currentDebt: 12345.67, statementDay: 5, dueDay: 16, statementDebt: 12345.67, statementTotal: 12345.67, statementMinimum: 2469.13, futureInstallments: future };
  assert.equal(minimumPaymentOf(card), 2469.13);
  assert.equal(availableLimitOf(card), 854.33);
  assert.equal(availableLimitOf({ ...card, limit: 13000 }), -1145.67);
});
