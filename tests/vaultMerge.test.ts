import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeList, mergeVault } from '../src/utils/vaultMerge';

test('üç yönlü birleştirme: yerel ekleme ve uzak ekleme korunur', () => {
  const base = [{ id: 'a', amount: 1 }];
  const local = [...base, { id: 'b', amount: 2 }];
  const remote = [...base, { id: 'c', amount: 3 }];
  assert.deepEqual(mergeList(base, local, remote).map(x => x.id).sort(), ['a', 'b', 'c']);
});

test('üç yönlü birleştirme: yerel silme uzak kaydı etkilemez', () => {
  const base = [{ id: 'a' }, { id: 'b' }];
  const remote = [...base, { id: 'c' }];
  assert.deepEqual(mergeList(base, [{ id: 'b' }], remote).map(x => x.id).sort(), ['b', 'c']);
});

test('üç yönlü birleştirme: yerel düzenleme aynı kayıt için önceliklidir', () => {
  const base = [{ id: 'a', amount: 1 }];
  assert.deepEqual(mergeList(base, [{ id: 'a', amount: 2 }], [{ id: 'a', amount: 3 }]), [{ id: 'a', amount: 2 }]);
});

test('kasa birleştirme: varlık ve geçmiş kayıtları korunur', () => {
  const empty = { version: 2, updatedAt: '2026-01-01', transactions: [], categoryLimits: [], savingsGoals: [], familyMembers: [], installments: [], creditCards: [], recurring: [], assets: [], assetHistory: [], currency: 'TRY' } as any;
  const local = { ...empty, assets: [{ id: 'local' }], assetHistory: [{ id: 'local-snapshot' }] };
  const remote = { ...empty, assets: [{ id: 'remote' }], assetHistory: [{ id: 'remote-snapshot' }] };
  const merged = mergeVault(empty, local, remote);
  assert.deepEqual(merged.assets.map((a: any) => a.id).sort(), ['local', 'remote']);
  assert.deepEqual(merged.assetHistory.map((a: any) => a.id).sort(), ['local-snapshot', 'remote-snapshot']);
});
