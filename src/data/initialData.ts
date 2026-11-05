import type { FamilyMember } from '../types/budget';

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Emre', role: 'Maaşlı / Hane Reisi', color: '#0EA5E9' },
  { id: 'm2', name: 'Eşim', role: 'Maaşlı / Ebeveyn', color: '#EC4899' },
  { id: 'm3', name: 'Ortak', role: 'Tüm Hane', color: '#3B82F6' }
];

export const EXPENSE_CATEGORIES = [
  'Konut & Kira',
  'Konut & Birikim',
  'Borç & Kredi',
  'Sigorta & Araç',
  'Ulaşım & Motor',
  'Market & Gıda',
  'Faturalar & Aidat',
  'Sağlık & Bakım',
  'Eğlence & Restoran',
  'Giyim & Alışveriş',
  'Diğer Harcamalar'
];

export const SAVING_CATEGORIES = ['Birikim', 'Altın', 'Döviz', 'Yatırım'];

export const INCOME_CATEGORIES = [
  'Maaş & Ücret',
  'Ek Gelir & Prim',
  'Yatırım Geliri',
  'Diğer Gelirler'
];
