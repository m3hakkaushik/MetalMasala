import { contactRepo } from '../repositories/index.js';

// [L14] Contact messages use the same repository interface as the other JSON resources.
export function saveMessage(message) {
  return contactRepo.create(message);
}
