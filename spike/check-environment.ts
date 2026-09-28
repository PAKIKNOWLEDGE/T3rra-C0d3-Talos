import { inspectEnvironment } from '../src/host/environment.js';

const report = inspectEnvironment();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;

export { inspectEnvironment } from '../src/host/environment.js';
