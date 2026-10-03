import assert from 'node:assert/strict';import{runScale}from'../../tools/perf/synthetic-scale.mjs';
const r=runScale(100000);assert.equal(r.n,100000);assert.ok(r.pagination.p95<100);assert.ok(r.search.p95<100);assert.ok(r.exportRowsPerSec>1000);console.log(JSON.stringify(r));
