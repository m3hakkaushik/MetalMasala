# MongoDB development setup · L20

Phase 2 uses JSON files for the HTTP application. The database settings select a connection only for the standalone `db:ping` script. The ping reports the selected database, MongoDB server version, and visible collection names. It closes the client on both success and failure.

## Local with Docker Compose

From the server package, run these commands in order.

```sh
cd server
npm ci
cp .env.example .env
docker compose up -d --wait mongo
DB_TARGET=local npm run db:ping
```

The service publishes MongoDB 7 on `127.0.0.1:27017` and keeps its files in the Compose volume. Run `docker compose stop mongo` to stop the service and retain the volume. Use the default `MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/metal_masala` unless your instance uses a separate port or credentials.

A system installation also works. Start `mongod` with an existing writable data directory and a loopback bind, then run the same ping. Follow the [MongoDB 7 installation guide](https://www.mongodb.com/docs/v7.0/installation/) for your operating system.

## Atlas

1. Open the team project in Atlas and create or select its development cluster. Choose the Free tier if it is available for the project.
2. Under **Database Access**, create a database user with access to the development database.
3. Add your current network address to the project's IP access list so the driver can reach the cluster.
4. From the cluster's **Connect** menu, select **Drivers** and **Node.js**. Put the configured SRV connection string in the ignored `server/.env` as `MONGODB_URI`. Set `DB_NAME` to the database the user can access.
5. Run `DB_TARGET=atlas npm run db:ping` from `server/`. An empty database can report that there are no collections yet.

[Atlas connection setup](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/) · [Node.js driver connection options](https://www.mongodb.com/docs/drivers/node/v6.x/connect/connection-options/)

## Inspect the database

- Run `mongosh "mongodb://127.0.0.1:27017/metal_masala"` for a local shell, then `db.runCommand({ ping: 1 })` or `show collections`.
- Connect Compass with the same local address to inspect a database and collections through a graphical interface.
- A database groups collections. A collection holds BSON documents. BSON represents types such as dates and `ObjectId` that do not have a native equivalent in JSON. MongoDB commonly uses an `ObjectId` as the document's `_id`. The API presents identifiers as strings named `id`.

A failed ping exits with status 1. Check that the local instance is listening or that Atlas can accept connections from your network. For Atlas, verify the database user's permissions and connection settings in the ignored environment file.
