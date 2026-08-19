import fs from 'node:fs';
import path from 'node:path';

const runtimeDir = path.resolve(__dirname, '../runtime');

function resetRuntime(): void {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
  for (const name of fs.readdirSync(runtimeDir)) {
    if (name === '.gitkeep') {
      continue;
    }
    fs.rmSync(path.join(runtimeDir, name), { recursive: true, force: true });
  }
  const gitkeep = path.join(runtimeDir, '.gitkeep');
  if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, '');
  }
  console.log(`Runtime directory reset: ${runtimeDir}`);
}

resetRuntime();
