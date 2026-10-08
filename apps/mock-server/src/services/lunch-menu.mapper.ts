import type { LunchMenuContent, LunchMenuModule, LunchMenuRow } from './lunch-menu.client';

const MODULE_LABELS: Record<string, string> = {
  combo: '套餐',
  special: '特色餐',
  noodle: '面档',
  bread_booking: '面包预约',
  light_meal_booking: '轻食预约',
  birthday_booking: '生日餐预约',
};

const LIST_MULTI_TYPES = new Set(['combo', 'special', 'noodle']);

export type LunchMenuSection = {
  id: string;
  title: string;
  text: string;
  imageUrls: string[];
};

export type MappedLunchMenu = {
  title: string;
  menuDate: string;
  coverUrl: string;
  sections: LunchMenuSection[];
};

export function isPublishedLunchMenu(row: LunchMenuRow | null | undefined): boolean {
  if (!row || row.id == null) {
    return false;
  }
  return (row.status || '').toLowerCase() === 'published';
}

function cleanUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function listTextFromDishes(mod: LunchMenuModule): string {
  return (mod.dishes ?? [])
    .map((dish) => {
      const name = (dish.name || '').trim();
      const composition = (dish.composition || '').trim();
      if (name && composition) {
        return `${name}\n${composition}`;
      }
      return name || composition;
    })
    .filter(Boolean)
    .join('\n\n');
}

function moduleImages(mod: LunchMenuModule, listMulti: boolean): string[] {
  if (listMulti) {
    const fromImages = (mod.images ?? []).map(cleanUrl).filter(Boolean);
    if (fromImages.length) {
      return fromImages;
    }
    return (mod.dishes ?? []).map((dish) => cleanUrl(dish.image)).filter(Boolean);
  }
  const single = cleanUrl(mod.image);
  return single ? [single] : [];
}

export function mapPublishedContent(content: LunchMenuContent | null | undefined): LunchMenuSection[] {
  const modules = [...(content?.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sections: LunchMenuSection[] = [];
  modules.forEach((mod, index) => {
    if (mod.enabled === false) {
      return;
    }
    const type = (mod.type || '').trim();
    const listMulti = LIST_MULTI_TYPES.has(type);
    const text = (mod.list_text || '').trim() || (listMulti ? listTextFromDishes(mod) : '');
    const imageUrls = moduleImages(mod, listMulti);
    if (!text && imageUrls.length === 0) {
      return;
    }
    sections.push({
      id: mod.id?.trim() || `${type || 'module'}-${index + 1}`,
      title: MODULE_LABELS[type] || type || '菜单',
      text,
      imageUrls,
    });
  });
  return sections;
}

export function mapLunchMenuRow(row: LunchMenuRow): MappedLunchMenu | null {
  if (!isPublishedLunchMenu(row)) {
    return null;
  }
  const snapshot = row.published_content ?? row.content;
  return {
    title: row.title?.trim() || '今日午餐',
    menuDate: row.menu_date?.trim() || '',
    coverUrl: cleanUrl(row.cover_image),
    sections: mapPublishedContent(snapshot),
  };
}
