import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HUB_LAYOUT_BLOCKS,
  ensureBannerBlock,
  normalizeLayoutBlocks,
} from '@/lib/smartHubLayout';

describe('smartHubLayout — banner em todos os templates', () => {
  it('normalizeLayoutBlocks usa padrão com banner quando vazio', () => {
    expect(normalizeLayoutBlocks([])[0]).toBe('banner');
    expect(normalizeLayoutBlocks(null)).toEqual(DEFAULT_HUB_LAYOUT_BLOCKS);
  });

  it('ensureBannerBlock adiciona banner no topo do Clássico antigo', () => {
    const classic = ensureBannerBlock([
      'logo',
      'header',
      'description',
      'buttons',
      'footer',
    ]);
    expect(classic[0]).toBe('banner');
    expect(classic).toContain('logo');
    expect(classic).toContain('buttons');
    expect(classic.filter((b) => b === 'banner')).toHaveLength(1);
  });

  it('ensureBannerBlock preserva Banner + Grid e WhatsApp First', () => {
    const bannerGrid = ensureBannerBlock([
      'banner',
      'logo',
      'header',
      'grid',
      'social',
      'footer',
    ]);
    expect(bannerGrid[0]).toBe('banner');
    expect(bannerGrid).toContain('grid');

    const wa = ensureBannerBlock([
      'logo',
      'header',
      'whatsapp',
      'contact',
      'map',
      'buttons',
      'footer',
    ]);
    expect(wa[0]).toBe('banner');
    expect(wa).toContain('whatsapp');
    expect(wa).toContain('map');
  });

  it('ensureBannerBlock move banner existente para o topo', () => {
    expect(
      ensureBannerBlock(['logo', 'banner', 'header'])
    ).toEqual(['banner', 'logo', 'header']);
  });
});
