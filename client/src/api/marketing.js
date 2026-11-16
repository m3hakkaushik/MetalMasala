import http from './http';

export const subscribe = (email) => http.post('/newsletter', { email });
export const sendContact = (fields) => http.post('/contact', fields);
