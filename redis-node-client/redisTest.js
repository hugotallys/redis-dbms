import { createClient } from 'redis';

const client = createClient();

client.on('error', (err) => console.log('Redis Client Error', err));

await client.connect();

client.FLUSHALL();

console.log(await client.KEYS('*'));

await client.set('key', 'value');

console.log(await client.get('key'));

await client.quit();