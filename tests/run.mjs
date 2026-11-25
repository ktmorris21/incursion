// Optional headless core verification (Node 22+); the browser page is the canonical harness.
import {coreTests,runTests} from './suite.js';
const results=await runTests(coreTests);for(const r of results){console.log(`${r.ok?'PASS':'FAIL'} ${r.name} (${r.ms.toFixed(2)} ms)`);if(!r.ok)console.error(r.error);}const passed=results.filter(r=>r.ok).length;console.log(`${passed}/${results.length} passed`);if(passed!==results.length)process.exitCode=1;
