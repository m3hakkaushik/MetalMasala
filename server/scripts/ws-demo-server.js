import { WebSocket, WebSocketServer } from 'ws';

// [L39] Local-only echo and broadcast, with control-frame ping/pong.
const server = new WebSocketServer({
  host: '127.0.0.1',
  port: 4002,
  maxPayload: 1024,
});
server.on('listening', () =>
  console.log('WebSocket demo ready at ws://127.0.0.1:4002')
);
server.on('connection', (socket) => {
  socket.alive = true;
  socket.on('pong', () => {
    socket.alive = true;
  });
  socket.on('error', () => socket.terminate());
  socket.on('message', (data, isBinary) => {
    if (isBinary) return;
    const text = data.toString();
    socket.send(`echo: ${text}`);
    for (const peer of server.clients) {
      if (peer !== socket && peer.readyState === WebSocket.OPEN)
        peer.send(`broadcast: ${text}`);
    }
  });
});
const heartbeat = setInterval(() => {
  for (const socket of server.clients) {
    if (!socket.alive) {
      socket.terminate();
      continue;
    }
    socket.alive = false;
    socket.ping();
  }
}, 5000);
server.on('close', () => clearInterval(heartbeat));
