// @vitest-environment node
// (vite.config.ts arrastra esbuild, que no corre bajo jsdom)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readNetlifyGlobalHeaders } from '../../../vite.config';

/**
 * SPEC-08 — netlify.toml y robots.txt. Se comprueban contra el texto de
 * docs/architecture.md §7 para que un cambio en cualquiera de los dos lados
 * se note. `vite preview` sirve estos mismos encabezados (readNetlifyGlobalHeaders).
 */
const root = new URL('../../../', import.meta.url);
const toml = readFileSync(new URL('netlify.toml', root), 'utf8');
const architecture = readFileSync(new URL('docs/architecture.md', root), 'utf8');

const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' data:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

describe('netlify.toml', () => {
  it('build en dist con Node 24', () => {
    expect(toml).toMatch(/\[build\]\s+command = "npm run build"\s+publish = "dist"/);
    expect(toml).toMatch(/NODE_VERSION = "24"/);
  });

  it('redirección SPA /* → /index.html 200', () => {
    expect(toml).toMatch(/\[\[redirects\]\]\s+from = "\/\*"\s+to = "\/index\.html"\s+status = 200/);
  });

  it('encabezados de seguridad de architecture.md §7, tal cual', () => {
    const headers = readNetlifyGlobalHeaders();
    expect(headers).toEqual({
      'Content-Security-Policy': CSP,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'X-Robots-Tag': 'noindex',
    });
    // La CSP del documento de arquitectura es la fuente; si cambia, esto avisa.
    expect(architecture).toContain(`\`${CSP}\``);
  });

  it('caché inmutable para /assets/* y no-cache para index.html y sw.js', () => {
    const rule = (path: string) =>
      new RegExp(
        `\\[\\[headers\\]\\]\\s+for = "${path.replace(/[*.]/g, '\\$&')}"\\s+\\[headers\\.values\\]\\s+Cache-Control = "([^"]+)"`,
      ).exec(toml)?.[1];
    expect(rule('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(rule('/index.html')).toBe('no-cache');
    expect(rule('/')).toBe('no-cache');
    expect(rule('/sw.js')).toBe('no-cache');
    expect(rule('/manifest.webmanifest')).toBe('no-cache');
  });
});

describe('public/robots.txt', () => {
  it('no permite indexar nada', () => {
    const robots = readFileSync(new URL('public/robots.txt', root), 'utf8');
    expect(robots).toMatch(/User-agent: \*\s+Disallow: \/\s*$/);
  });
});
