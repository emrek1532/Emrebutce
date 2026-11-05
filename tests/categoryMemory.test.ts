import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnedCategory, merchantKey } from '../src/utils/categoryMemory';

const tx = (description: string, category: string, date: string): any => ({ description, category, date, type: 'expense' });

test('işyeri anahtarı ilk anlamlı kelime', () => {
  assert.equal(merchantKey('MIGROS KADIKÖY 123'), 'migros');
  assert.equal(merchantKey('Şok Market'), 'sok');
});

test('en son kullanılan kategori önerilir', () => {
  const list = [tx('Migros', 'Diğer Harcamalar', '2026-10-01'), tx('MIGROS ATAŞEHİR', 'Market & Gıda', '2026-11-01')];
  assert.equal(learnedCategory('migros kadıköy', list, 'expense', ['Market & Gıda', 'Diğer Harcamalar']), 'Market & Gıda');
  assert.equal(learnedCategory('Shell', list, 'expense', ['Market & Gıda']), undefined);
});
