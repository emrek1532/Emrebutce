import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBankSms } from '../src/utils/smsParser';

const cards: any = [
  { id: 'g', bank: 'Garanti', name: 'Garanti Bonus' },
  { id: 'a', bank: 'Akbank', name: 'Axess' }
];

test('Garanti işyeri SMS: tutar, işyeri, tarih, kart', () => {
  const d = parseBankSms('4567 ile biten Bonus kartinizla 12/11/2026 tarihinde MIGROS ISTANBUL isyerinden 345,60 TL tutarinda harcama yapilmistir.', cards);
  assert.equal(d.amount, 345.6);
  assert.equal(d.description, 'Migros Istanbul');
  assert.equal(d.date, '2026-11-12');
  assert.equal(d.type, 'expense');
  assert.equal(d.cardId, 'g');
});

test("Ek'li işyeri ve binlik ayraç", () => {
  const d = parseBankSms("Axess kartinizla SHELL'den 1.250,00 TL harcama yapildi.", cards);
  assert.equal(d.amount, 1250);
  assert.equal(d.description, 'Shell');
  assert.equal(d.cardId, 'a');
});

test('Maaş SMS gelir olarak okunur', () => {
  const d = parseBankSms('Hesabiniza 15.11.2026 tarihinde 45.000,00 TL maas yatirildi.', cards);
  assert.equal(d.type, 'income');
  assert.equal(d.amount, 45000);
  assert.equal(d.description, 'Maaş');
});

test('Tutar yoksa null', () => {
  assert.equal(parseBankSms('Merhaba', cards).amount, null);
});
