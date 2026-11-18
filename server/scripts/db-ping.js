import { MongoClient } from 'mongodb';
import config from '../src/config/index.js';

// [L20] Verify the chosen development database without connecting the HTTP app to it.
async function pingDatabase() {
  const { target, uri, name } = config.db;
  let client;
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    await client.connect();
    const database = client.db(name);
    const ping = await database.command({ ping: 1 });
    if (ping.ok !== 1) throw new Error('Unexpected ping result');
    const { version } = await database.admin().command({ buildInfo: 1 });
    const collections = await database
      .listCollections(
        {},
        {
          nameOnly: true,
          authorizedCollections: true,
        }
      )
      .toArray();
    const names = collections.map((collection) => collection.name).sort();
    console.log(
      `MongoDB ${version} ping succeeded for ${target} database "${name}".`
    );
    console.log(
      names.length
        ? `Collections: ${names.join(', ')}`
        : 'Collections: none yet'
    );
  } catch (error) {
    // The driver's message may include a connection string. Print only the error class.
    console.error(
      `MongoDB ping failed for ${target} (${error.name ?? 'Error'}).`
    );
    console.error(
      'Check the configured target, credentials, network access, and database permissions.'
    );
    process.exitCode = 1;
  } finally {
    try {
      await client?.close();
    } catch {
      console.error('Could not close the MongoDB client cleanly.');
      process.exitCode = 1;
    }
  }
}

await pingDatabase();
