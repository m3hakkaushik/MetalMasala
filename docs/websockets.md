# WebSockets and realtime commerce

An HTTP request usually delivers one response. A WebSocket starts with an HTTP Upgrade handshake. The client sends `Upgrade: websocket` and a challenge in `Sec-WebSocket-Key`. A successful server replies `101 Switching Protocols` and `Sec-WebSocket-Accept`. The open connection carries text or binary messages in frames, and either peer can send a frame independently. Ping and pong control frames help detect broken or idle connections.

| Transport | Direction | Good fit |
| --- | --- | --- |
| Polling | Repeated HTTP requests | Infrequent changes and simple infrastructure |
| Server-Sent Events | Server to browser | Streaming notifications where writes can use HTTP |
| WebSocket | Full duplex | Room subscriptions, status updates, and interactive commands |

From `server/`, run `npm run ws:demo`, then run `npm run ws:client` in two other terminals. Send a line to see an echo at the sender and a broadcast at the other client. Each client reports the server’s heartbeat ping. The demo listens on loopback at port 4002 independently of Express.

The storefront uses Socket.IO for namespaces, rooms, authenticated handshakes, reconnection and an HTTP polling fallback. `/` carries product counts and drops. `/account` verifies JWTs and checks order ownership before joining an order room. `/admin` also checks the current staff role. Client subscriptions rejoin on reconnect and reconcile orders through REST, which covers missed updates. Current viewer counts track connected sockets, so two tabs count as two viewers.

A production reverse proxy must forward the upgrade headers and allow idle timeouts longer than the heartbeat. Horizontal scaling needs a shared adapter and a cross-process event transport. Socket.IO polling also needs sticky routing when multiple instances are behind a load balancer. The in-process EventEmitter and viewer counts currently operate within one server instance.
