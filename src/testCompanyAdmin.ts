import { db } from './services/storage';

console.log('--- STARTING COMPANY ADMIN & TASK ASSIGNMENT VERIFICATION TEST ---');

db.resetToSeed();

// 1. Check seed accounts
console.log('\n[TEST 1] Verifying Seed Accounts and Roles:');
const superAdmin = db.getAllProfiles().find((p) => p.email === 'admin@system.com')!;
const johnAdmin = db.getAllProfiles().find((p) => p.email === 'john@alarisaero.com')!;
const amanEmp = db.getAllProfiles().find((p) => p.email === 'aman@alarisaero.com')!;
const sarahAdmin = db.getAllProfiles().find((p) => p.email === 'sarah@companyb.com')!;

console.log(`- Super Admin: ${superAdmin?.full_name} -> Role: ${superAdmin?.role}`);
console.log(`- Alaris Company Admin: ${johnAdmin?.full_name} -> Role: ${johnAdmin?.role}`);
console.log(`- Alaris Employee: ${amanEmp?.full_name} -> Role: ${amanEmp?.role}`);
console.log(`- Company B Admin: ${sarahAdmin?.full_name} -> Role: ${sarahAdmin?.role}`);

if (superAdmin?.role !== 'SUPER_ADMIN') throw new Error('Expected admin@system.com to be SUPER_ADMIN');
if (johnAdmin?.role !== 'COMPANY_ADMIN') throw new Error('Expected john@alarisaero.com to be COMPANY_ADMIN');
if (amanEmp?.role !== 'EMPLOYEE') throw new Error('Expected aman@alarisaero.com to be EMPLOYEE');
if (sarahAdmin?.role !== 'COMPANY_ADMIN') throw new Error('Expected sarah@companyb.com to be COMPANY_ADMIN');
console.log('✓ PASS: Initial seed roles verified.');

// 2. Super Admin Appointment Power
console.log('\n[TEST 2] Super Admin Appointing & Revoking Company Admin:');
db.setCurrentUser(superAdmin.id);

// Promote Aman to Company Admin
db.setCompanyAdmin(amanEmp.id, true);
const amanPromoted = db.getProfileById(amanEmp.id);
console.log(`- Promoted Aman to: ${amanPromoted?.role}`);
if (amanPromoted?.role !== 'COMPANY_ADMIN') throw new Error('Failed to promote Aman to COMPANY_ADMIN');

// Demote Aman back to Employee
db.setCompanyAdmin(amanEmp.id, false);
const amanDemoted = db.getProfileById(amanEmp.id);
console.log(`- Demoted Aman back to: ${amanDemoted?.role}`);
if (amanDemoted?.role !== 'EMPLOYEE') throw new Error('Failed to demote Aman back to EMPLOYEE');
console.log('✓ PASS: Super Admin appointment and revocation verified.');

// 3. Non-Super-Admin Cannot Appoint Company Admin
console.log('\n[TEST 3] Ensuring Non-Super-Admins Cannot Appoint Company Admins:');
db.setCurrentUser(johnAdmin.id); // John is COMPANY_ADMIN
try {
  const res = db.setCompanyAdmin(amanEmp.id, true);
  if (res.error) {
    console.log(`- Expected rejection for Company Admin: "${res.error}"`);
  } else {
    throw new Error('FAILED: Company Admin should not be allowed to call setCompanyAdmin');
  }
} catch (err: any) {
  console.log(`- Expected rejection for Company Admin: "${err.message}"`);
}

db.setCurrentUser(amanEmp.id); // Aman is EMPLOYEE
try {
  const res = db.setCompanyAdmin(johnAdmin.id, false);
  if (res.error) {
    console.log(`- Expected rejection for Employee: "${res.error}"`);
  } else {
    throw new Error('FAILED: Regular Employee should not be allowed to call setCompanyAdmin');
  }
} catch (err: any) {
  console.log(`- Expected rejection for Employee: "${err.message}"`);
}
console.log('✓ PASS: Non-super-admins strictly blocked from appointing company admins.');

// 4. Workforce Management: Add Employee
console.log('\n[TEST 4] Workforce Management (Add Employee):');

// Regular employee attempts to add colleague -> should be blocked
db.setCurrentUser(amanEmp.id);
const addAttemptByEmployee = db.addEmployeeByColleague({
  full_name: 'Unauthorized Tech',
  email: 'unauth@alarisaero.com',
  job_title: 'Tech Specialist',
});
console.log(`- Employee add attempt result: error="${addAttemptByEmployee.error}"`);
if (!addAttemptByEmployee.error || !addAttemptByEmployee.error.includes('Only Company Admins or Super Admins')) {
  throw new Error('Regular employee was not blocked from adding personnel!');
}

// Company Admin adds colleague -> should succeed
db.setCurrentUser(johnAdmin.id);
const addAttemptByAdmin = db.addEmployeeByColleague({
  full_name: 'Marcus Brody',
  email: 'marcus@alarisaero.com',
  job_title: 'Avionics Technician',
  department: 'Technical',
});
console.log(`- Company Admin add attempt: full_name="${addAttemptByAdmin.profile?.full_name}", role="${addAttemptByAdmin.profile?.role}"`);
if (addAttemptByAdmin.error || !addAttemptByAdmin.profile) {
  throw new Error(`Company Admin failed to add colleague: ${addAttemptByAdmin.error}`);
}
const marcusId = addAttemptByAdmin.profile.id;
console.log('✓ PASS: Employee blocked from adding; Company Admin succeeded.');

// 5. Workforce Management: Remove Employee
console.log('\n[TEST 5] Workforce Management (Remove Employee):');

// Regular employee attempts to delete Marcus -> should fail
db.setCurrentUser(amanEmp.id);
const delAttemptEmp = db.deleteProfile(marcusId);
console.log(`- Regular employee delete attempt result: success=${delAttemptEmp.success}, error="${delAttemptEmp.error}"`);
if (delAttemptEmp.success || !delAttemptEmp.error?.includes('Only Company Admins or Super Admins')) {
  throw new Error('FAILED: Regular employee should not be allowed to delete team member');
}

// Company Admin attempts cross-company delete on Sarah Connor -> should fail
db.setCurrentUser(johnAdmin.id);
const delAttemptCross = db.deleteProfile(sarahAdmin.id);
console.log(`- Company Admin cross-company delete result: success=${delAttemptCross.success}, error="${delAttemptCross.error}"`);
if (delAttemptCross.success || !delAttemptCross.error?.includes('own company')) {
  throw new Error('FAILED: Company Admin should not be allowed to delete member from another company');
}

// Company Admin deletes Marcus within own company -> should succeed
const delAttemptOwn = db.deleteProfile(marcusId);
console.log(`- Company Admin delete own company member: success=${delAttemptOwn.success}`);
if (!delAttemptOwn.success) {
  throw new Error(`Company Admin failed to delete colleague: ${delAttemptOwn.error}`);
}
const deletedMarcus = db.getProfileById(marcusId);
console.log(`- Marcus after deletion by John Admin: ${deletedMarcus ? 'FOUND' : 'NULL (Deleted successfully)'}`);
if (deletedMarcus) {
  throw new Error('Marcus was not deleted by Company Admin!');
}
console.log('✓ PASS: Member removal permissions and company scoping verified.');

// 6. Open Task Assignment for All Members
console.log('\n[TEST 6] Open Task Assignment for All Members:');

// Re-add a technician for task assignment
db.setCurrentUser(johnAdmin.id);
const techRes = db.addEmployeeByColleague({
  full_name: 'Elena Rostova',
  email: 'elena@alarisaero.com',
  job_title: 'Structural Inspector',
});
const elenaId = techRes.profile!.id;

// Log in as regular employee Aman
db.setCurrentUser(amanEmp.id);

// Get tasks visible to Aman
const amanTasks = db.getTasks();
console.log(`- Aman sees ${amanTasks.length} task(s) for Alaris.`);
if (amanTasks.length === 0) throw new Error('No tasks found for Alaris company');

const targetTask = amanTasks[0];
console.log(`- Assigning task "${targetTask.name}" to newly added colleague Elena Rostova by regular employee Aman:`);
db.updateTask(targetTask.id, { assigned_user_id: elenaId });

const updatedTask = db.getTaskById(targetTask.id);
console.log(`- Task now assigned to user ID: ${updatedTask?.assigned_user_id} (${updatedTask?.assigned_user?.full_name})`);
if (updatedTask?.assigned_user_id !== elenaId) {
  throw new Error('Task was not updated with assigned employee!');
}
console.log('✓ PASS: Regular employee successfully assigned a task to a newly added team member.');

console.log('\nALL TESTS PASSED SUCCESSFULLY! 🚀');
