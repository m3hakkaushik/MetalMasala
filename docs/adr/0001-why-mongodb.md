# ADR 0001 · Use MongoDB for the catalogue and order store

Status **Accepted for Phase 3**

Lecture **L19**

## Context

The Metal मसाला catalogue includes rings, cuffs, jewellery sets, and other pieces with different attributes. The shop reads and filters products frequently. Once a customer orders, the order must retain the purchased name, price, image, and address even if the catalogue or address book changes.

## Options considered

| Option | Benefits | Trade-offs |
| --- | --- | --- |
| Relational database | Foreign keys, structured queries, joins, and transactions support consistent inventory and reporting. JSON columns can hold variable product details. | Category-specific attributes and order snapshots need an explicit relational and JSON schema design. |
| MongoDB | Document shapes fit the API's nested product details and immutable order snapshots. Catalogue reads can use compound and text indexes. | Schema enforcement and references need care. Cross-collection reads use references or aggregations such as `$lookup`. Multi-document transactions require a replica set or sharded cluster. |
| JSON files | Easy to inspect and enough for the standalone development phases. | Whole-file reads, a single process per store, and the absence of indexes limit concurrency and querying. |

## Decision

Use MongoDB with Mongoose for Phase 3. Keep products and categories as distinct collections. Store order items and the shipping address as snapshots in each order document. Use references for reviews and for linked catalogue entities.

## Consequences

Phase 2 supplies local and Atlas connection settings plus a standalone health check. Phase 3 can replace the JSON adapter behind the existing repository method names. The team must define schema validators, indexes, and a strategy for concurrent stock changes as part of that work.
