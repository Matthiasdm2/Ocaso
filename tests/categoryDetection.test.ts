import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  detectCategory,
  detectCategoryFromImages,
  detectCategorySmart,
} from '@/lib/categoryDetection';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detectCategory (text)', () => {
  it('detects fietsen from text keywords', () => {
    const res = detectCategory('Mooie racefiets in topconditie');
    expect(res).not.toBeNull();
    expect(res?.categorySlug).toBe('fietsen');
  });
});

describe('detectCategoryFromImages (mock fetch)', () => {
  it('uses classifier API to detect category', async () => {
    const fakeClassifierRes = { category_index: 1, confidence: 0.5 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeClassifierRes,
    } as unknown as Response));

    const res = await detectCategoryFromImages(['https://example.com/a.jpg']);
    expect(res).not.toBeNull();
    expect(res?.categorySlug).toBe('fietsen');
    expect(res?.confidence).toBeGreaterThan(0);
  });
});

describe('detectCategorySmart', () => {
  it('prefers image result when it has higher confidence', async () => {
    // text detection should detect fietsen
    const text = 'Mooie vintage fiets';

    // fake classifier reports a high confidence for electronics
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ category_index: 4, confidence: 0.95 }),
    } as unknown as Response));

    const res = await detectCategorySmart(text, ['https://example.com/a.jpg']);
    expect(res).not.toBeNull();
    expect(res?.categorySlug).toBe('elektronica');
  });
});
