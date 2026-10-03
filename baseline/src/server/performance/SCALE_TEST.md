# Scale test
- **Confirmed:** synthetic harness supports 100k–1M by argument; it reports p50/p95/p99, memory, keyset pagination, search and export throughput. Query-plan text specifies `(sort_key,id)` keyset index; PostgreSQL plans are not executed here.
- **Proposal:** SLO gate for the executed in-memory 100k harness is p95 < 100 ms for pagination/search and export >1,000 rows/sec. Production SLOs require owner approval and PostgreSQL evidence.
- **Needs Legal Review:** none identified beyond real-data access/retention controls; no real data used.
Failure/recovery: use keyset instead of deep offsets, bounded page sizes, worker backpressure and retryable import batches. On SLO failure, retain metrics, reduce concurrency and investigate index/query plan; do not claim database performance from this harness.
