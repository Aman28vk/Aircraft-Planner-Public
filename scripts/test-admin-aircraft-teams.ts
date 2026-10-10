if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import assert from 'assert';
import { db } from '../src/services/storage.js';
import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING =
  'process.env.DATABASE_URL || ""';

async function testAdminAircraftTeams() {
  console.log('=== STARTING ADMIN AIRCRAFT TEAMS INTEGRATION TEST ===\n');

  // Find sample aircraft
  const aircraftList = db.getAircraftList();
  assert(aircraftList.length > 0, 'At least one aircraft exists');
  const targetAircraft = aircraftList[0];
  console.log(`Target Aircraft: MSN ${targetAircraft.msn} (${targetAircraft.id})`);

  // 1. Test: Ordinary Employee is BLOCKED from creating teams
  console.log('\n1. Testing Employee restriction on team creation...');
  // Find an employee (e.g. John or Marcus)
  const profiles = db.getAllProfiles();
  const employee = profiles.find((p) => p.role === 'EMPLOYEE');
  assert(employee, 'Employee found');

  db.login(employee.email, employee.password || 'JohnCustomPass2026');
  console.log(`Logged in as employee: ${employee.email} (${employee.role})`);

  const empCreateAttempt = db.createTeam({
    name: 'Unauthorized Avionics Squad',
    code: 'UNAUTH',
    aircraft_id: targetAircraft.id,
    color: '#ff0000',
  });

  assert(empCreateAttempt.error, 'Employee creation should fail with error');
  assert(!empCreateAttempt.team, 'No team returned for employee');
  assert(
    empCreateAttempt.error?.includes('Unauthorized') || empCreateAttempt.error?.includes('Admin'),
    `Expected unauthorized error, got: ${empCreateAttempt.error}`
  );
  console.log(`✓ Non-admin creation blocked with message: "${empCreateAttempt.error}"`);

  // 2. Test: Company Admin CAN create a team for the Aircraft project
  console.log('\n2. Testing Company Admin creating a team for Aircraft project...');
  const companyAdmin = profiles.find((p) => p.role === 'COMPANY_ADMIN');
  assert(companyAdmin, 'Company Admin found');

  db.login(companyAdmin.email, companyAdmin.password || 'password123');
  console.log(`Logged in as Company Admin: ${companyAdmin.email} (${companyAdmin.role})`);

  const teamName = `Avionics Teardown MSN ${targetAircraft.msn}`;
  const teamCode = `AVN-${targetAircraft.msn.slice(-3)}`;

  const caCreateRes = db.createTeam({
    name: teamName,
    code: teamCode,
    description: `Specialized avionics removal squad for MSN ${targetAircraft.msn}`,
    color: '#0284c7',
    aircraft_id: targetAircraft.id,
    is_active: true,
  });

  assert(!caCreateRes.error, `Company Admin create error: ${caCreateRes.error}`);
  assert(caCreateRes.team, 'Team object returned');
  assert.strictEqual(caCreateRes.team.aircraft_id, targetAircraft.id, 'Team aircraft_id properly attached');
  console.log(`✓ Company Admin created team "${teamName}" (ID: ${caCreateRes.team.id}) for MSN ${targetAircraft.msn}`);

  // 3. Test: Super Admin CAN create team for Aircraft project
  console.log('\n3. Testing Super Admin creating another team for Aircraft project...');
  db.login('admin@system.com', 'Amankumar');
  console.log('Logged in as Super Admin');

  const saTeamName = `Structure Crew MSN ${targetAircraft.msn}`;
  const saTeamCode = `STR-${targetAircraft.msn.slice(-3)}`;

  const saCreateRes = db.createTeam({
    name: saTeamName,
    code: saTeamCode,
    description: `Airframe structure dismantling team for MSN ${targetAircraft.msn}`,
    color: '#10b981',
    aircraft_id: targetAircraft.id,
    is_active: true,
  });

  assert(!saCreateRes.error, `Super Admin create error: ${saCreateRes.error}`);
  assert(saCreateRes.team, 'Team object returned');
  assert.strictEqual(saCreateRes.team.aircraft_id, targetAircraft.id, 'Team aircraft_id properly attached');
  console.log(`✓ Super Admin created team "${saTeamName}" (ID: ${saCreateRes.team.id}) for MSN ${targetAircraft.msn}`);

  // 4. Test: Query teams for specific Aircraft
  console.log('\n4. Testing querying teams by aircraft_id...');
  const msnTeams = db.getTeams(targetAircraft.id);
  const foundCaTeam = msnTeams.find((t) => t.id === caCreateRes.team?.id);
  const foundSaTeam = msnTeams.find((t) => t.id === saCreateRes.team?.id);
  assert(foundCaTeam, 'Created CA team found in aircraft-filtered list');
  assert(foundSaTeam, 'Created SA team found in aircraft-filtered list');
  console.log(`✓ Found ${msnTeams.length} teams available for MSN ${targetAircraft.msn} (including dedicated project teams)`);

  // 5. Direct Supabase PostgreSQL Verification
  console.log('\n5. Verifying live Supabase database record for teams...');
  const pgClient = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();

    // Insert sync record to live Supabase to verify schema and persistence
    await pgClient.query(
      `INSERT INTO teams (id, company_id, name, code, description, color, aircraft_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         code = EXCLUDED.code,
         aircraft_id = EXCLUDED.aircraft_id,
         color = EXCLUDED.color,
         updated_at = NOW();`,
      [
        caCreateRes.team.id,
        targetAircraft.company_id,
        caCreateRes.team.name,
        caCreateRes.team.code,
        caCreateRes.team.description,
        caCreateRes.team.color,
        targetAircraft.id,
        true,
      ]
    );

    const checkRes = await pgClient.query(
      `SELECT t.id, t.name, t.code, t.aircraft_id, a.msn, a.model
       FROM teams t
       LEFT JOIN aircraft a ON a.id = t.aircraft_id
       WHERE t.id = $1;`,
      [caCreateRes.team.id]
    );

    assert(checkRes.rows.length > 0, 'Team record found in Supabase');
    const row = checkRes.rows[0];
    assert.strictEqual(row.aircraft_id, targetAircraft.id, 'Supabase row aircraft_id matches');
    assert.strictEqual(row.msn, targetAircraft.msn, 'Supabase JOIN to aircraft table matches MSN');
    console.log(`✓ Supabase row verified: Team "${row.name}" [${row.code}] linked to MSN ${row.msn} (${row.model})!`);

    // 6. Clean up the test teams from Supabase
    await pgClient.query('DELETE FROM teams WHERE id = $1', [caCreateRes.team.id]);
    await pgClient.query('DELETE FROM teams WHERE id = $1', [saCreateRes.team.id]);
    console.log('✓ Cleaned up test records from live Supabase');
  } catch (err: any) {
    console.error('Supabase query error:', err.message);
    throw err;
  } finally {
    await pgClient.end();
  }

  // 7. Clean up local db test teams
  db.deleteTeam(caCreateRes.team.id);
  db.deleteTeam(saCreateRes.team.id);
  console.log('✓ Cleaned up test records from local storage');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

testAdminAircraftTeams().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
