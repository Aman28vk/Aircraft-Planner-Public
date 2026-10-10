if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function testConnection(label: string, connectionString: string) {
  console.log(`\nTesting connection to [${label}]...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // required for cloud Supabase
  });

  try {
    await client.connect();
    console.log(`✓ Successfully connected to ${label}!`);
    const res = await client.query('SELECT version(), current_database(), current_user;');
    console.log('Result:', res.rows[0]);

    // Check existing tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`Public tables count: ${tablesRes.rows.length}`);
    if (tablesRes.rows.length > 0) {
      console.log('Existing tables:', tablesRes.rows.map(r => r.table_name).join(', '));
    }

    await client.end();
    return true;
  } catch (err: any) {
    console.error(`✗ Connection failed to ${label}:`, err.message);
    try { await client.end(); } catch {}
    return false;
  }
}

async function run() {
  const poolerUrl = 'process.env.DATABASE_URL || ""';
  const directUrl = 'process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || ""';

  const poolerOk = await testConnection('Transaction Pooler (Port 6543)', poolerUrl);
  const directOk = await testConnection('Direct Connection (Port 5432)', directUrl);

  console.log('\nSummary:');
  console.log('Pooler:', poolerOk ? 'OK' : 'FAILED');
  console.log('Direct:', directOk ? 'OK' : 'FAILED');
}

run();

