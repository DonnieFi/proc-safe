import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { WindowsJob } from '../dist/windows-job.js';
const fixture = resolve('target/aarch64-pc-windows-msvc/release/proc-safe-job-fixture.exe');
const count = () => Number(execFileSync(fixture, ['handle-count', String(process.pid)], { encoding: 'utf8' }).trim());
const job = WindowsJob.create();
console.log(JSON.stringify({ phase: 'count-only-controls', counts: Array.from({ length: 8 }, count) }));
const rows = [];
for (let i = 0; i < 12; i++) {
 const before = count();
 let code;
 try { job.spawn({ executable: 'C:\\missing.exe', commandLine: 'missing', stdin: 'pipe' }); throw Error('unexpected launch success'); }
 catch (e) { if (e.code !== 'operation-failed') throw e; code = e.code; }
 rows.push({ before, after: count(), code });
}
console.log(JSON.stringify({ phase: 'failed-launches', rows }));
job.close();
console.log(JSON.stringify({ phase: 'job-closed', counts: Array.from({ length: 4 }, count) }));
