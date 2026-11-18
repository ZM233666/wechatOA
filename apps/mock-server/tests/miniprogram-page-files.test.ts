import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const projectRoot = resolve(__dirname, '../../miniprogram');
const project = JSON.parse(readFileSync(resolve(projectRoot, 'project.config.json'), 'utf8'));
const miniRoot = resolve(projectRoot, project.miniprogramRoot);
const app = JSON.parse(readFileSync(resolve(miniRoot, 'app.json'), 'utf8'));
const pages: string[] = (app.pages as string[]).concat(
  (app.subPackages as Array<{ root: string; pages: string[] }>).flatMap(sub =>
    sub.pages.map(page => `${sub.root}/${page}`)),
);
function verifyFile(path: string): void {
  expect(existsSync(path), `missing file: ${relative(projectRoot, path)}`).toBe(true);
  expect(lstatSync(path).isFile(), `not a regular file: ${path}`).toBe(true);
  expect(readFileSync(path).length, `empty source file: ${path}`).toBeGreaterThan(0);
  const relativePath = relative(realpathSync(miniRoot), realpathSync(path));
  expect(relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)).toBe(false);
  let current = path;
  while (current !== miniRoot) {
    expect(readdirSync(dirname(current)), `wrong path case: ${current}`).toContain(basename(current));
    current = dirname(current);
  }
}
function filesUnder(dir: string, suffix: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path, suffix) : entry.name.endsWith(suffix) ? [path] : [];
  });
}
function verifyReference(from: string, src: string): void {
  expect(src, `dynamic template reference in ${from}`).not.toContain('{{');
  const target = src.startsWith('/') ? resolve(miniRoot, src.slice(1)) : resolve(dirname(from), src);
  verifyFile(target);
}

describe('registered mini-program page sources and compiler visibility', () => {
  it('uses the documented project root and real app.json, not another output directory', () => {
    expect(project.miniprogramRoot).toBe('miniprogram/');
    expect(project.compileType).toBe('miniprogram');
    expect(realpathSync(miniRoot)).toBe(resolve(projectRoot, 'miniprogram'));
    expect(pages.filter(page => page.startsWith('subpackages/kb-life/wetalk/')).sort()).toEqual([
      'subpackages/kb-life/wetalk/detail', 'subpackages/kb-life/wetalk/index', 'subpackages/kb-life/wetalk/magazine',
    ]);
  });
  it.each(pages)('%s has real, correctly cased, nonempty TS/JSON/WXML/WXSS files', page => {
    for (const ext of ['ts', 'json', 'wxml', 'wxss']) verifyFile(resolve(miniRoot, `${page}.${ext}`));
    expect(() => JSON.parse(readFileSync(resolve(miniRoot, `${page}.json`), 'utf8'))).not.toThrow();
  });
  it('resolves every WXML include/import source relative to the template or mini-program root', () => {
    for (const path of filesUnder(miniRoot, '.wxml')) {
      const source = readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      for (const match of source.matchAll(/<(?:include|import)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/g)) {
        verifyReference(path, match[1]);
      }
    }
  });
  it('resolves every WXSS import', () => {
    for (const path of filesUnder(miniRoot, '.wxss')) {
      const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) {
        verifyReference(path, match[1]);
      }
    }
  });
  it('explicitly includes all WeTalk source files even when unused-file analysis marks them unused', () => {
    const rule = { type: 'folder', value: 'miniprogram/subpackages/kb-life/wetalk' };
    expect(project.packOptions.include).toContainEqual(rule);
    const folder = resolve(projectRoot, rule.value);
    expect(folder).toBe(resolve(miniRoot, 'subpackages/kb-life/wetalk'));
    for (const page of pages.filter(page => page.startsWith('subpackages/kb-life/wetalk/'))) {
      for (const ext of ['ts', 'json', 'wxml', 'wxss']) {
        const file = relative(projectRoot, resolve(miniRoot, `${page}.${ext}`)).split(sep).join('/');
        expect(file.startsWith(`${rule.value}/`)).toBe(true);
      }
    }
  });
  it('retains the magazine list, empty/error states and working PDF handler bindings', () => {
    const template = readFileSync(resolve(miniRoot, 'subpackages/kb-life/wetalk/magazine.wxml'), 'utf8');
    const script = readFileSync(resolve(miniRoot, 'subpackages/kb-life/wetalk/magazine.ts'), 'utf8');
    for (const text of ['leftItems', 'rightItems', "pageStatus === 'empty'", "pageStatus === 'error'", 'bindtap="onMagazineTap"']) {
      expect(template).toContain(text);
    }
    expect(script).toContain('readerIssueId: `emagazine:${id}`');
    expect(template).toContain('source="wetalk"');
    expect(template).toContain('<insight-reader');
    expect(script).not.toContain('openWetalkPdf');
    expect(script).not.toContain('[...items]');
  });
});
