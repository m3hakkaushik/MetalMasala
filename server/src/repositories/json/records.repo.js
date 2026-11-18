import { randomUUID } from 'node:crypto';
import { readStore, updateStore } from '../../utils/jsonStore.js';

function addRecord(records, data) {
  const now = new Date().toISOString();
  const record = { ...data, id: randomUUID(), createdAt: now, updatedAt: now };
  records.push(record);
  return record;
}

function matches(record, filter) {
  return Object.entries(filter).every(([key, value]) => record[key] === value);
}

function recordsRepository(filename) {
  return {
    async findMany({
      filter = {},
      sort = 'newest',
      page = 1,
      limit = 12,
    } = {}) {
      const records = (await readStore(filename)).filter((record) =>
        matches(record, filter)
      );
      records.sort((a, b) =>
        sort === 'oldest'
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt)
      );
      const offset = (page - 1) * limit;
      return {
        items: records.slice(offset, offset + limit),
        total: records.length,
      };
    },
    async findById(id) {
      return (
        (await readStore(filename)).find((record) => record.id === id) ?? null
      );
    },
    async findBySlug(slug) {
      return (
        (await readStore(filename)).find((record) => record.slug === slug) ??
        null
      );
    },
    create(data) {
      return updateStore(filename, (records) => ({
        result: addRecord(records, data),
      }));
    },
    update(id, patch) {
      return updateStore(filename, (records) => {
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return { result: null, changed: false };
        const record = records[index];
        const updated = {
          ...record,
          ...patch,
          id,
          createdAt: record.createdAt,
          updatedAt: new Date().toISOString(),
        };
        records[index] = updated;
        return { result: updated };
      });
    },
    remove(id) {
      return updateStore(filename, (records) => {
        const index = records.findIndex((record) => record.id === id);
        if (index === -1) return { result: false, changed: false };
        records.splice(index, 1);
        return { result: true };
      });
    },
    // [L14] A create-if-absent operation uses one read/write transaction in the JSON adapter.
    createIfAbsent(match, data) {
      return updateStore(filename, (records) => {
        const existing = records.find((record) => matches(record, match));
        if (existing)
          return {
            result: { record: existing, created: false },
            changed: false,
          };
        return { result: { record: addRecord(records, data), created: true } };
      });
    },
  };
}

export const subscriberRepo = recordsRepository('subscribers.json');
export const contactRepo = recordsRepository('contact-messages.json');
