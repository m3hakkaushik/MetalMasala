import http from './http';
export const askStylist = (data) => http.post('/ai/stylist', data);
export const describeProduct = (data) => http.post('/ai/describe', data);
