const IMG_FIT_STYLE = 'max-width:100%;width:100%;height:auto;display:block;margin:12px 0';
const TABLE_FIT_STYLE = 'max-width:100%;width:100%;border-collapse:collapse';

function stripSizeAttrs(attrs: string): string {
  return attrs
    .replace(/\s(?:width|height)\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(?:width|height)\s*=\s*[^\s>]+/gi, '');
}

function withFitStyle(attrs: string, extra: string): string {
  const cleaned = stripSizeAttrs(attrs);
  if (/style\s*=/i.test(cleaned)) {
    return cleaned.replace(/style\s*=\s*(['"])([\s\S]*?)\1/i, (_match, quote: string, style: string) => {
      const next = style
        .replace(/(?:^|;)\s*(?:width|height|max-width|min-width|max-height|min-height)\s*:[^;]*/gi, '')
        .replace(/^;+|;+$/g, '')
        .trim();
      const merged = [next, extra].filter(Boolean).join(';');
      return `style=${quote}${merged}${quote}`;
    });
  }
  return `${cleaned} style="${extra}"`;
}

function fitHtmlToScreen(html: string): string {
  const trimmed = (html || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    .replace(/<img\b([^>]*?)(\/?)\s*>/gi, (_full, attrs: string, closing: string) => {
      return `<img${withFitStyle(attrs, IMG_FIT_STYLE)} width="100%"${closing}>`;
    })
    .replace(/<table\b([^>]*?)>/gi, (_full, attrs: string) => {
      return `<table${withFitStyle(attrs, TABLE_FIT_STYLE)}>`;
    });
}

Component({
  properties: {
    html: {
      type: String,
      value: '',
    },
  },
  data: {
    nodes: '',
  },
  observers: {
    html(value: string) {
      this.setData({ nodes: fitHtmlToScreen(value) });
    },
  },
});
