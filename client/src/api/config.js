export const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
export const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  new URL(apiUrl, window.location.origin).origin;
