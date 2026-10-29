// Fork-only evidence driver. No production loading override is used for input proof.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
assert.equal(process.platform, 'win32');
assert.equal(process.arch, 'arm64');
const root = process.cwd();
const consumer = resolve('proof-consumer');
mkdirSync(consumer);
writeFileSync(join(consumer, 'package.json'), '{"private":true,"type":"module"}');
const artifacts = resolve('release-artifacts');
const tarballs = readdirSync(artifacts).filter(x => x.endsWith('.tgz')).map(x => join(artifacts, x));
assert.equal(tarballs.length, 2);
const env = { ...process.env, PROC_SAFE_NATIVE: 'require', npm_config_cache: resolve('proof-npm-cache') };
for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'NPM_TOKEN', 'NODE_AUTH_TOKEN', 'PROC_SAFE_TEST_JOB_FAULT_ADDON']) delete env[key];
function run(executable, args, cwd = root, extra = {}) {
  const r = spawnSync(executable, args, { cwd, env: { ...env, ...extra }, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.error) throw r.error;
  assert.equal(r.status, 0, `${executable} exited ${r.status}`);
}
run(process.execPath, [process.env.npm_execpath, 'install', '--ignore-scripts', '--omit=optional', '--no-audit', '--no-fund', ...tarballs], consumer);
const installed = join(consumer, 'node_modules/@openclaw/proc-safe');
const native = join(consumer, 'node_modules/@openclaw/proc-safe-win32-arm64-msvc/proc-safe-native.node');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(digest(native), digest(resolve('packages/win32-arm64-msvc/proc-safe-native.node')));
for (const file of readdirSync(resolve('dist')).filter(x => x.endsWith('.js'))) assert.equal(digest(join(installed, 'dist', file)), digest(resolve('dist', file)), file);
const scripts = join(installed, 'scripts'); mkdirSync(scripts);
for (const file of ['pr30-windows-trace.mjs', 'windows-pin-test-binding.mjs']) copyFileSync(resolve('scripts', file), join(scripts, file));
console.log(JSON.stringify({ platform: process.platform, arch: process.arch, node: process.version, installedNativeSha256: digest(native), installedDistMatchesBuild: true }));
run(process.execPath, [join(scripts, 'pr30-windows-trace.mjs'), 'inputs']);
run('bun', ['-e', 'if(process.arch !== "arm64") throw Error("Bun is not native ARM64"); console.log(process.versions)']);
run('bun', [join(scripts, 'pr30-windows-trace.mjs'), 'inputs']);
// Explicitly separate adversarial test addon from installed production-package proof.
const fault = { PROC_SAFE_TEST_JOB_FAULT_ADDON: resolve('target/job-fault/proc-safe-job-fault.node') };
run(process.execPath, [join(scripts, 'pr30-windows-trace.mjs'), 'fault-proof'], root, fault);
run('bun', [join(scripts, 'pr30-windows-trace.mjs'), 'fault-proof'], root, fault);
