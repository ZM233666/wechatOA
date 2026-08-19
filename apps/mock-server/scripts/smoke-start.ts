/**
 * smoke-start.ts
 *
 * 子进程启动测试：
 *  1. 以测试端口启动 dist/server.js（避免占用 3100）
 *  2. 等待 /api/health 可访问（最长 15 秒）
 *  3. 依次发送真实 HTTP 请求验证关键接口
 *  4. 测试结束后可靠关闭子进程
 *  5. 超时或失败时输出子进程 stdout / stderr
 *
 * 运行方式（在 apps/mock-server 目录或通过 pnpm --filter mock-server test:start）：
 *   tsx scripts/smoke-start.ts
 *
 * 前提：dist/server.js 已存在（先执行 pnpm build:mock）。
 */

import http from 'node:http';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const TEST_PORT = 3199;
const TEST_HOST = '127.0.0.1';
const DIST_SERVER = path.resolve(__dirname, '../dist/server.js');
const STARTUP_TIMEOUT_MS = 15_000;
const HEALTH_POLL_INTERVAL_MS = 300;

interface CheckResult {
  url: string;
  status: number;
  ok: boolean;
  body?: string;
}

function httpGet(url: string): Promise<CheckResult> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode ?? 0,
          ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
          body: Buffer.concat(chunks).toString('utf8').slice(0, 200),
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Request timed out: ${url}`));
    });
  });
}

function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function poll() {
      httpGet(url)
        .then((result) => {
          if (result.ok) {
            resolve();
          } else {
            retry();
          }
        })
        .catch(() => retry());
    }

    function retry() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server did not become healthy within ${timeoutMs}ms`));
        return;
      }
      setTimeout(poll, HEALTH_POLL_INTERVAL_MS);
    }

    poll();
  });
}

function killProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    // 若 SIGTERM 后 3 秒还未退出则强制 SIGKILL
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 3000);
  });
}

async function main(): Promise<void> {
  const baseUrl = `http://${TEST_HOST}:${TEST_PORT}`;

  console.log('▶ Smoke-start: launching dist/server.js …');
  const stdout: string[] = [];
  const stderr: string[] = [];

  const child = spawn(process.execPath, [DIST_SERVER], {
    env: {
      ...process.env,
      MOCK_PORT: String(TEST_PORT),
      MOCK_HOST: TEST_HOST,
      MOCK_DELAY_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdout.push(text);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderr.push(text);
  });

  let childError: Error | null = null;
    child.on('error', (err: Error) => {
    childError = err;
  });

  // 等待服务健康
  try {
    await waitForHealth(`${baseUrl}/api/health`, STARTUP_TIMEOUT_MS);
  } catch {
    console.error('✗ Server failed to start within timeout.');
    console.error('  stdout:', stdout.join(''));
    console.error('  stderr:', stderr.join(''));
    if (childError) {
      console.error('  child error:', childError);
    }
    await killProcess(child);
    process.exit(1);
  }

  console.log('✓ Server is healthy. Running checks …\n');

  const checks: Array<{ url: string; expectStatus: number; label: string }> = [
    { url: `${baseUrl}/api/health`, expectStatus: 200, label: 'GET /api/health' },
    { url: `${baseUrl}/api/home`, expectStatus: 200, label: 'GET /api/home' },
    { url: `${baseUrl}/api/news/news-001`, expectStatus: 200, label: 'GET /api/news/news-001' },
    { url: `${baseUrl}/api/news?page=1&pageSize=3`, expectStatus: 200, label: 'GET /api/news?page=1&pageSize=3' },
    { url: `${baseUrl}/api/news?__scenario=empty`, expectStatus: 200, label: 'GET /api/news?__scenario=empty' },
    { url: `${baseUrl}/api/news?__scenario=error`, expectStatus: 500, label: 'GET /api/news?__scenario=error' },
    { url: `${baseUrl}/api/news/categories`, expectStatus: 200, label: 'GET /api/news/categories' },
    { url: `${baseUrl}/api/news?category=company`, expectStatus: 200, label: 'GET /api/news?category=company' },
    { url: `${baseUrl}/api/news?keyword=%E8%BD%A8%E9%81%93%E4%BA%A4%E9%80%9A`, expectStatus: 200, label: 'GET /api/news?keyword=轨道交通' },
    { url: `${baseUrl}/api/news?featured=true`, expectStatus: 200, label: 'GET /api/news?featured=true' },
    { url: `${baseUrl}/api/news/news-draft-demo`, expectStatus: 404, label: 'GET /api/news/news-draft-demo' },
    { url: `${baseUrl}/api/news/news-scheduled-demo`, expectStatus: 404, label: 'GET /api/news/news-scheduled-demo' },
    { url: `${baseUrl}/api/news/news-archived-demo`, expectStatus: 404, label: 'GET /api/news/news-archived-demo' },
    { url: `${baseUrl}/mock-assets/banners/banner-001.png`, expectStatus: 200, label: 'GET /mock-assets/banners/banner-001.png' },
  ];

  let failures = 0;

  for (const check of checks) {
    try {
      const result = await httpGet(check.url);
      const pass = result.status === check.expectStatus;
      console.log(`  ${pass ? '✓' : '✗'} ${check.label} → ${result.status}${pass ? '' : ` (expected ${check.expectStatus})`}`);
      if (!pass) {
        failures += 1;
        console.log(`    body: ${result.body}`);
      }
    } catch (err) {
      console.log(`  ✗ ${check.label} → ERROR: ${(err as Error).message}`);
      failures += 1;
    }
  }

  console.log('');
  await killProcess(child);

  if (failures > 0) {
    console.error(`\n✗ Smoke-start FAILED: ${failures} check(s) failed.`);
    process.exit(1);
  }

  console.log('✓ Smoke-start PASSED: all checks passed.');
}

main().catch((err: unknown) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
