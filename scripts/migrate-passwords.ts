if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import pg from 'pg';
const { Client } = pg;

async function migratePasswords() {
  console.log('=== STARTING PASSWORD SCHEMA MIGRATION IN SUPABASE ===');

  const connectionString =
    'process.env.DATABASE_URL || ""';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✓ Connected to Supabase PostgreSQL database.');

  // 1. Add password column to profiles if it does not exist
  await client.query(`
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password123';
  `);
  console.log('✓ Added password column to profiles table.');

  // 2. Set admin@system.com password to "Amankumar"
  await client.query(`
    UPDATE profiles 
    SET password = 'Amankumar' 
    WHERE email = 'admin@system.com';
  `);
  console.log('✓ Updated admin@system.com password to "Amankumar".');

  // 3. Ensure all other accounts have a default password if null
  await client.query(`
    UPDATE profiles 
    SET password = 'password123' 
    WHERE password IS NULL;
  `);
  console.log('✓ Ensured all existing accounts have passwords set.');

  // 4. Query and display current profiles with their passwords
  const res = await client.query(`
    SELECT id, email, full_name, role, password 
    FROM profiles 
    ORDER BY role, full_name;
  `);

  console.log('\n--- VERIFIED SUPABASE PROFILES WITH PASSWORDS ---');
  console.table(res.rows);

  await client.end();
  console.log('✓ Migration script completed successfully.');
}

migratePasswords().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

