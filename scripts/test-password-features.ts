if (process.loadEnvFile) { try { process.loadEnvFile(); } catch {} }
import assert from 'assert';
import { db } from '../src/services/storage.js';
import pg from 'pg';
const { Client } = pg;

async function testPasswordFeatures() {
  console.log('=== STARTING PASSWORD FEATURES INTEGRATION TEST ===\n');

  // 1. Super Admin Password
  console.log('1. Testing Admin Password ("Amankumar")...');
  const wrongAdmin = db.login('admin@system.com', 'WrongPassword123');
  assert.strictEqual(wrongAdmin.success, false, 'Admin wrong password rejected');
  console.log('✓ Rejected invalid admin password');

  const goodAdmin = db.login('admin@system.com', 'Amankumar');
  assert.strictEqual(goodAdmin.success, true, 'Admin login with Amankumar succeeds');
  assert.strictEqual(goodAdmin.user?.role, 'SUPER_ADMIN', 'Logged in as SUPER_ADMIN');
  console.log('✓ Admin login with "Amankumar" succeeded');

  // 2. User Self-Service Password Reset via OTP
  console.log('\n2. Testing User Self-Service Password Reset via OTP ("9876")...');
  const resetRes = db.resetPasswordWithOtp('sarah@companyb.com', '9876', 'SarahSecret999');
  assert.strictEqual(resetRes.success, true, 'Sarah reset password succeeded');
  console.log('✓ Reset password succeeded for sarah@companyb.com');

  const oldSarahLogin = db.login('sarah@companyb.com', 'password123');
  assert.strictEqual(oldSarahLogin.success, false, 'Sarah old password rejected');
  console.log('✓ Sarah old password rejected');

  const newSarahLogin = db.login('sarah@companyb.com', 'SarahSecret999');
  assert.strictEqual(newSarahLogin.success, true, 'Sarah logged in with new password');
  console.log('✓ Sarah logged in with "SarahSecret999"');

  // 3. Super Admin Setting Password for Anyone
  console.log('\n3. Testing Super Admin setting password for John Smith...');
  // Log in as Super Admin first
  db.login('admin@system.com', 'Amankumar');
  const allProfiles = db.getAllProfiles();
  const john = allProfiles.find((p) => p.email === 'john@alarisaero.com');
  assert(john, 'John Smith found');

  const setPwdRes = db.setUserPassword(john.id, 'JohnCustomPass2026');
  assert.strictEqual(setPwdRes.success, true, 'Super Admin set password succeeded');
  console.log('✓ Super Admin updated John Smith password to "JohnCustomPass2026"');

  const johnNewLogin = db.login('john@alarisaero.com', 'JohnCustomPass2026');
  assert.strictEqual(johnNewLogin.success, true, 'John Smith logged in with admin-assigned password');
  console.log('✓ John Smith logged in with new password');

  // 4. Initial Password decided by the person adding a new employee
  console.log('\n4. Testing Initial Password decided when adding a new colleague/employee...');
  const addRes = db.addEmployeeByColleague({
    full_name: 'David Test',
    email: 'david.test@alarisaero.com',
    password: 'InitialPass4David!',
    job_title: 'Avionics Tech',
    department: 'Technical',
  });
  assert(addRes.employee, 'Employee David created');
  assert.strictEqual(addRes.employee.password, 'InitialPass4David!', 'David password set to initial password');
  console.log('✓ Created David Test with initial password decided by colleague: "InitialPass4David!"');

  // Verify David cannot log in with default password
  const davidDefaultLogin = db.login('david.test@alarisaero.com', 'password123');
  assert.strictEqual(davidDefaultLogin.success, false, 'David default password rejected');

  // Verify David logs in with the creator-assigned initial password
  const davidLogin = db.login('david.test@alarisaero.com', 'InitialPass4David!');
  assert.strictEqual(davidLogin.success, true, 'David logged in with assigned initial password');
  console.log('✓ David logged in with assigned initial password');

  // 5. Testing Self-Service Password Reset / Change inside Profile
  console.log('\n5. Testing Self-Service Password Change inside Profile (by David)...');
  // David is currently the logged-in user
  const davidChangeWrong = db.changeMyPassword('DavidBrandNewPass#9', 'WrongCurrentPass');
  assert.strictEqual(davidChangeWrong.success, false, 'Password change with wrong current password rejected');
  console.log('✓ Rejected password change with incorrect current password');

  const davidChangeGood = db.changeMyPassword('DavidBrandNewPass#9', 'InitialPass4David!');
  assert.strictEqual(davidChangeGood.success, true, 'David changed password inside profile successfully');
  console.log('✓ David updated password inside profile to "DavidBrandNewPass#9"');

  const davidOldPassLogin = db.login('david.test@alarisaero.com', 'InitialPass4David!');
  assert.strictEqual(davidOldPassLogin.success, false, 'David old initial password rejected');

  const davidNewPassLogin = db.login('david.test@alarisaero.com', 'DavidBrandNewPass#9');
  assert.strictEqual(davidNewPassLogin.success, true, 'David logged in with new profile password');
  console.log('✓ David logged in with updated profile password');

  // 6. Query live Supabase database to verify sync
  console.log('\n6. Verifying persistence in live Supabase PostgreSQL database...');
  const connectionString =
    'process.env.DATABASE_URL || ""';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const { rows } = await client.query(`
    SELECT email, full_name, role, password 
    FROM profiles 
    WHERE email IN ('admin@system.com', 'john@alarisaero.com', 'david.test@alarisaero.com')
    ORDER BY email;
  `);

  console.log('Live profiles in Supabase:');
  console.table(rows);

  const adminDb = rows.find((r) => r.email === 'admin@system.com');
  assert.strictEqual(adminDb?.password, 'Amankumar', 'Admin password in Supabase is Amankumar');

  await client.end();
  console.log('✓ Supabase PostgreSQL database verified successfully.');

  console.log('\n=== ALL PASSWORD TESTS PASSED 100%! ===');
}

testPasswordFeatures().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

