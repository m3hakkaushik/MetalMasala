export const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
const mockConfig =
  import.meta.env.VITE_MOCK_GROUPS ?? (import.meta.env.DEV ? 'all' : '');
export const mockGroups = mockConfig
  .split(',')
  .map((group) => group.trim())
  .filter(Boolean);

export const isMocked = (group) =>
  mockGroups.includes('all') || mockGroups.includes(group);
