import type { CloudVaultPayload } from '../types/budget';

type Entity = { id: string };

// Kayıt bazında üç yollu birleştirme: bu cihazın ortak tabandan (base) sonra yaptığı eklemeler,
// düzenlemeler ve silmeler buluttaki (remote) sürümün üzerine uygulanır. Aynı kayıt iki tarafta
// da değiştiyse bu cihazdaki hali kazanır. Taban yoksa yalnızca bu cihaza özgü kayıtlar eklenir.
export function mergeList<T extends Entity>(base: T[] | undefined, local: T[] | undefined, remote: T[] | undefined): T[] {
  const baseMap = new Map((base ?? []).map((x) => [x.id, x]));
  const result = new Map((remote ?? []).map((x) => [x.id, x]));
  for (const item of local ?? []) {
    const before = baseMap.get(item.id);
    const remoteItem = result.get(item.id);
    if (!before) {
      if (!remoteItem || base) result.set(item.id, item);
    } else if (JSON.stringify(before) !== JSON.stringify(item)) {
      result.set(item.id, item);
    }
  }
  if (base) {
    const localIds = new Set((local ?? []).map((x) => x.id));
    for (const id of baseMap.keys()) if (!localIds.has(id)) result.delete(id);
  }
  return Array.from(result.values());
}

export function mergeVault(
  base: CloudVaultPayload | null,
  local: CloudVaultPayload,
  remote: CloudVaultPayload
): CloudVaultPayload {
  const b = base ?? undefined;
  return {
    ...remote,
    updatedAt: new Date().toISOString(),
    transactions: mergeList(b?.transactions, local.transactions, remote.transactions).sort((x, y) =>
      y.date === x.date ? (y.createdAt ?? '').localeCompare(x.createdAt ?? '') : y.date.localeCompare(x.date)
    ),
    categoryLimits: mergeList(b?.categoryLimits, local.categoryLimits, remote.categoryLimits),
    savingsGoals: mergeList(b?.savingsGoals, local.savingsGoals, remote.savingsGoals),
    familyMembers: mergeList(b?.familyMembers, local.familyMembers, remote.familyMembers),
    installments: mergeList(b?.installments, local.installments, remote.installments),
    creditCards: mergeList(b?.creditCards, local.creditCards, remote.creditCards),
    recurring: mergeList(b?.recurring, local.recurring, remote.recurring),
    currency: b && local.currency !== b.currency ? local.currency : remote.currency
  };
}
