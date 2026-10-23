import { describe, it, expect } from 'vitest';
import { courierEmailBase, normalizeProductName, productSellingPrice } from './admin-utils.js';

describe('courierEmailBase', () => {
  it('converts Arabic name to Latin email base', () => {
    expect(courierEmailBase('أحمد محمد')).toBe('ahmdmhmd');
  });

  it('handles names with mixed Arabic and Latin', () => {
    expect(courierEmailBase('أحمد123')).toBe('ahmd123');
  });

  it('collapses non-alphanumeric runs and truncates to 30 chars', () => {
    const longName = 'أحمد محمد علي عبدالله السعيد';
    const result = courierEmailBase(longName);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(/^[a-z0-9]+$/.test(result)).toBe(true);
  });

  it('returns default fallback for non-Arabic input', () => {
    expect(courierEmailBase('')).toBe('courier');
    expect(courierEmailBase('   ')).toBe('courier');
  });

  it('is deterministic for the same input', () => {
    expect(courierEmailBase('فاطمة')).toBe(courierEmailBase('فاطمة'));
  });
});

describe('normalizeProductName', () => {
  it('normalizes different alef forms to ا', () => {
    expect(normalizeProductName('أدوية')).toBe('ادويه');
    expect(normalizeProductName('إبرة')).toBe('ابره');
    expect(normalizeProductName('آلة')).toBe('اله');
  });

  it('replaces ة with ه', () => {
    expect(normalizeProductName('باراسيتامول')).toBe('باراسيتامول');
    expect(normalizeProductName('مرهم')).toBe('مرهم');
    expect(normalizeProductName('حبة')).toBe('حبه');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeProductName('دواء   مع   مسافات')).toBe('دواء مع مسافات');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeProductName('  دواء  ')).toBe('دواء');
  });

  it('lowercases latin characters', () => {
    expect(normalizeProductName('Vitamin C')).toBe('vitamin c');
  });
});

describe('productSellingPrice', () => {
  it('returns price with discount applied', () => {
    expect(productSellingPrice({ price: 100, discount: 20 })).toBe(80);
  });

  it('returns full price when discount is 0', () => {
    expect(productSellingPrice({ price: 100, discount: 0 })).toBe(100);
  });

  it('returns price when discount is missing', () => {
    expect(productSellingPrice({ price: 50 })).toBe(50);
  });

  it('returns 0 for zero price', () => {
    expect(productSellingPrice({ price: 0 })).toBe(0);
  });

  it('rounds the discounted price', () => {
    expect(productSellingPrice({ price: 33, discount: 33 })).toBe(Math.round(33 * (1 - 33 / 100)));
  });

  it('handles high discount', () => {
    expect(productSellingPrice({ price: 200, discount: 90 })).toBe(20);
  });
});
