if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function check() {
  const directUrl = 'process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ""';
  const client = new Client({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const jwtSecret = await client.query("SELECT current_setting('app.settings.jwt_secret', true) AS jwt_secret;");
    console.log('jwt_secret setting:', jwtSecret.rows[0]);
  } catch (e: any) {
    console.log('No app.settings.jwt_secret:', e.message);
  }

  try {
    const vault = await client.query("SELECT * FROM vault.decrypted_secrets;");
    console.log('vault secrets:', vault.rows);
  } catch (e: any) {
    console.log('No vault access:', e.message);
  }

  await client.end();
}

check();

