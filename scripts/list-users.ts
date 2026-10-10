if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function run() {
  const connectionString = 'process.env.DATABASE_URL || ""';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const res = await client.query(`
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.role,
      c.name AS company_name,
      p.department,
      p.status
    FROM profiles p
    LEFT JOIN companies c ON p.company_id = c.id
    ORDER BY p.role, p.full_name;
  `);

  console.log('--- ALL EXISTING PROFILES IN SUPABASE ---');
  console.table(res.rows);

  await client.end();
}

run();

