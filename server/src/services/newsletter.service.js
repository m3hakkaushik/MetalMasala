import { subscriberRepo } from '../repositories/index.js';

// [L14] Subscribe idempotently, even when the same email arrives in simultaneous requests.
export function subscribe({ email }) {
  return subscriberRepo.createIfAbsent({ email }, { email });
}
