import { db, normalizeDomain } from './services/storage';

console.log('================================================================');
console.log('RUNNING COMPREHENSIVE AUTH & COMPANY ACCESS CONTROL TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    failCount++;
  }
}

// Reset state
db.resetToSeed();

// -------------------------------------------------------------
// TEST 1: DOMAIN NORMALIZATION
// -------------------------------------------------------------
console.log('\n--- 1. Testing Domain Normalization ---');
assert(
  normalizeDomain('alarisaero.com') === 'alarisaero.com',
  'Lowercase domain unchanged'
);
assert(
  normalizeDomain('  AlarisAero.COM  ') === 'alarisaero.com',
  'Mixed-case and padded whitespace normalized'
);
assert(
  normalizeDomain('@alarisaero.com') === 'alarisaero.com',
  'Leading @ stripped'
);
assert(
  normalizeDomain('john.smith@AlarisAero.COM') === 'alarisaero.com',
  'Full email extracts normalized domain'
);

// -------------------------------------------------------------
// TEST 2: SUPER ADMIN AUTHENTICATION
// -------------------------------------------------------------
console.log('\n--- 2. Testing Super Admin Authentication ---');
const wrongPwdLogin = db.login('admin@system.com', 'wrongpassword');
assert(wrongPwdLogin.success === false, 'Wrong password rejected');
const adminLogin = db.login('admin@system.com', 'Amankumar');
assert(adminLogin.success === true, 'Super Admin login succeeded with Amankumar');
assert(adminLogin.user?.role === 'SUPER_ADMIN', 'Super Admin has role SUPER_ADMIN');
assert(db.getCurrentUser()?.role === 'SUPER_ADMIN', 'Storage state current user is SUPER_ADMIN');

// -------------------------------------------------------------
// TEST 3: COMPANY DOMAIN WHITELISTING ON LOGIN & REGISTRATION
// -------------------------------------------------------------
console.log('\n--- 3. Testing Unauthorized Organization Rejection ---');
const unauthorizedLogin = db.login('intruder@unauthorized-domain.com');
assert(unauthorizedLogin.success === false, 'Unauthorized domain rejected on login');
assert(
  unauthorizedLogin.error ===
    'Your organization is not authorized to access this application. Please contact your administrator.',
  'Exact user error message on unauthorized login'
);

const unauthorizedReg = db.register({
  email: 'newuser@unknowncompany.com',
  full_name: 'Unknown User',
});
assert(unauthorizedReg.success === false, 'Unauthorized domain rejected on registration');
assert(
  unauthorizedReg.error ===
    'Your organization is not authorized to access this application. Please contact your administrator.',
  'Exact user error message on unauthorized registration'
);

// -------------------------------------------------------------
// TEST 4: EMPLOYEE REGISTRATION UNDER AUTHORIZED COMPANY
// -------------------------------------------------------------
console.log('\n--- 4. Testing Employee Registration Under Authorized Company ---');
const empReg = db.register({
  email: 'alex.vance@alarisaero.com',
  full_name: 'Alex Vance',
  job_title: 'Avionics Engineer',
  department: 'Technical',
});
assert(empReg.success === true, 'Registration succeeded with authorized domain');
assert(empReg.user?.role === 'EMPLOYEE', 'Registered user strictly assigned role EMPLOYEE');
assert(empReg.user?.status === 'ACTIVE', 'Registered user status is ACTIVE');
assert(empReg.user?.company === 'Alaris Aerospace Systems', 'User automatically associated with company');

// -------------------------------------------------------------
// TEST 5: COMPANY CRUD & ACCESS REVOCATION
// -------------------------------------------------------------
console.log('\n--- 5. Testing Company Disablement & Tenant Isolation ---');
const companyB = db.getCompanyByDomain('companyb.com');
assert(companyB !== undefined && companyB.status === 'ACTIVE', 'Company B is initially ACTIVE');

// Sarah from Company B can log in
const sarahLoginActive = db.login('sarah@companyb.com');
assert(sarahLoginActive.success === true, 'Sarah from Company B can log in while active');

// Now Super Admin disables Company B
console.log('Disabling Company B...');
db.updateCompany(companyB!.id, { status: 'DISABLED' });
const updatedCompB = db.getCompanyById(companyB!.id);
assert(updatedCompB?.status === 'DISABLED', 'Company B status is now DISABLED');

// Sarah from Company B attempts login
const sarahLoginDisabled = db.login('sarah@companyb.com');
assert(
  sarahLoginDisabled.success === false,
  'Sarah is blocked immediately when her company is DISABLED'
);
assert(
  sarahLoginDisabled.error ===
    'Your organization is not authorized to access this application. Please contact your administrator.',
  'Exact company disabled error message returned'
);

// Re-enable Company B
console.log('Re-enabling Company B...');
db.updateCompany(companyB!.id, { status: 'ACTIVE' });
const sarahLoginReenabled = db.login('sarah@companyb.com');
assert(sarahLoginReenabled.success === true, 'Sarah can log in again once Company B is re-enabled');

// -------------------------------------------------------------
// TEST 6: INDIVIDUAL USER DISABLEMENT
// -------------------------------------------------------------
console.log('\n--- 6. Testing Individual User Disablement ---');
const john = db.getAllProfiles().find((p) => p.email === 'john@alarisaero.com');
assert(john !== undefined, 'John Smith exists');

// Disable John Smith
console.log('Disabling John Smith (individual account lockout)...');
db.updateUserStatus(john!.id, 'DISABLED');
const johnLogin = db.login('john@alarisaero.com');
assert(johnLogin.success === false, 'Disabled user cannot log in');
assert(
  johnLogin.error ===
    'Your account has been disabled. Please contact your administrator.',
  'Exact user account disabled error message returned'
);

// Another user from the SAME active company can still log in without interruption
const amanLogin = db.login('aman@alarisaero.com');
assert(
  amanLogin.success === true,
  'Other users in same company (Aman) can log in normally'
);

// Super Admin cannot be disabled
const adminDisableAttempt = db.updateUserStatus(
  '11111111-1111-1111-1111-111111111111',
  'DISABLED'
);
assert(
  adminDisableAttempt.error !== undefined,
  'Super Admin account cannot be disabled'
);

// -------------------------------------------------------------
// TEST 7: EMPLOYEE INVITATION SYSTEM
// -------------------------------------------------------------
console.log('\n--- 7. Testing Employee Invitation Workflow ---');
// Invite with unregistered domain
const invalidInvite = db.inviteEmployee({
  email: 'worker@unauthorized-corp.com',
  full_name: 'Worker',
});
assert(invalidInvite.error !== undefined, 'Invite with unregistered domain is rejected');

// Invite with valid domain
const validInvite = db.inviteEmployee({
  email: 'claire.redfield@alarisaero.com',
  full_name: 'Claire Redfield',
  job_title: 'Material Inspector',
  department: 'Warehouse',
});
assert(validInvite.error === undefined, 'Invite with authorized domain succeeds');
assert(validInvite.profile?.role === 'EMPLOYEE', 'Invited user has EMPLOYEE role');
assert(validInvite.invitation?.company_id === 'c1111111-1111-1111-1111-111111111111', 'Invitation linked to Alaris');

// Check simulated email queue
const emailLogs = db.getEmailLogs();
const inviteEmail = emailLogs.find((e) => e.recipient_email === 'claire.redfield@alarisaero.com');
assert(inviteEmail !== undefined, 'Simulated invitation email was logged in outbox');

// -------------------------------------------------------------
// TEST SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL AUTHENTICATION & ACCESS CONTROL TESTS PASSED SUCCESSFULLY! 🚀');
}

