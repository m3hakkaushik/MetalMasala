import { createInterface } from 'node:readline';
import { WebSocket } from 'ws';

const socket = new WebSocket('ws://127.0.0.1:4002');
const input = createInterface({ input: process.stdin, output: process.stdout });
input.on('line', (line) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(line);
});
input.on('close', () => socket.close());
socket.on('open', () =>
  console.log('Connected. Type a line to echo and broadcast.')
);
socket.on('message', (data) => console.log(data.toString()));
socket.on('ping', () => console.log('ping received, pong sent automatically'));
socket.on('error', (error) => console.error(error.message));
socket.on('close', () => input.close());
