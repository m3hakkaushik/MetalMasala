# Repository interface

Services use the same asynchronous interface for the JSON adapter and the planned MongoDB adapter. Every repository returns plain objects with a string `id`.

```js
/**
 * @typedef {{ filter?: object, sort?: string, page?: number, limit?: number }} ListOptions
 * @template RecordType
 * @typedef {{
 *   findMany: (options?: ListOptions) => Promise<{ items: RecordType[], total: number }>,
 *   findById: (id: string) => Promise<RecordType | null>,
 *   findBySlug: (slug: string) => Promise<RecordType | null>,
 *   create: (data: object) => Promise<RecordType>,
 *   update: (id: string, patch: object) => Promise<RecordType | null>,
 *   remove: (id: string) => Promise<boolean>
 * }} Repository
 */
```

- `total` is the number of matching records before pagination. The service calculates the response metadata.
- Items without a slug, such as contact messages and subscriptions, return `null` from `findBySlug`.
- The catalogue adapter also provides `getAllRaw` for CSV export and `countReferencingProducts` for category deletion. The subscriber adapter provides `createIfAbsent`, with a single queued check and insert in Phase 2. Use a unique email index and an atomic insert or upsert when replacing it with MongoDB.
- JSON writes use a temporary file and atomic rename. A process-local queue protects API catalogue mutations across both collections. Use one API process per JSON store during this phase.
- Product writes accept a category ID, slug, or embedded snapshot. MongoDB can persist the reference and project the embedded response fields. Preserve the public success and error envelopes.

See [MVC and request flow](../../../docs/mvc.md).
