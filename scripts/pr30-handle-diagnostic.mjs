import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { WindowsJob } from '../dist/windows-job.js';
const helper = resolve('target/pr30-handle-native.exe');
const snapshot = () => JSON.parse(execFileSync(helper, ['snapshot', String(process.pid)], { encoding: 'utf8' }));
const job = WindowsJob.create();
// Hold all observations until measurement ends; console startup is not a measured operation.
const controls = Array.from({ length: 4 }, snapshot);
const rows = [];
for (const stdin of ['null', 'pipe']) {
 for (let i = 0; i < 6; i++) {
  const before = snapshot();
  let code;
  try { job.spawn({ executable: 'C:\\missing.exe', commandLine: 'missing', stdin }); throw Error('unexpected launch success'); }
  catch (e) { if (e.code !== 'operation-failed') throw e; code = e.code; }
  rows.push({ stdin, attempt: i, before, after: snapshot(), code });
 }
}
job.close();
const closed = snapshot();
console.log(JSON.stringify({ controlSnapshots: controls, failedLaunches: rows, jobClosed: closed }));
process.stdout.write(execFileSync(helper, [], { encoding: 'utf8' }));
