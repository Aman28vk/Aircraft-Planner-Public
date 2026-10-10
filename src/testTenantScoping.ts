import { db } from './services/storage';
import { INITIAL_COMPANIES, INITIAL_PROFILES } from './services/seedData';

export async function runTenantScopingTests(): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = [];
  let passed = true;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      results.push(`[PASS] ${message}`);
    } else {
      results.push(`[FAIL] ${message}`);
      passed = false;
    }
  };

  results.push('--- STARTING MULTI-TENANT ISOLATION TESTS ---');

  // Reset to clean seed
  db.resetToSeed();

  const alarisCompany = INITIAL_COMPANIES.find((c) => c.name.includes('Alaris Aerospace Systems'))!;
  const companyB = INITIAL_COMPANIES.find((c) => c.name.includes('Company B Aviation'))!;
  const superAdmin = INITIAL_PROFILES.find((p) => p.role === 'SUPER_ADMIN')!;
  const alarisEmployee = INITIAL_PROFILES.find((p) => p.email === 'john@alarisaero.com')!;
  const companyBEmployee = INITIAL_PROFILES.find((p) => p.email === 'sarah@companyb.com')!;

  // 1. Super Admin Global View
  db.setCurrentUser(superAdmin.id);
  db.setSelectedCompanyFilter('ALL');
  const allAircraft = db.getAircraftList();
  assert(allAircraft.length >= 3, `Super Admin sees all aircraft (count: ${allAircraft.length})`);
  assert(allAircraft.some((a) => a.msn === '12345'), 'Super Admin sees Alaris MSN 12345');
  assert(allAircraft.some((a) => a.msn === '12347'), 'Super Admin sees Company B MSN 12347');

  // 2. Alaris Employee Scoping
  db.setCurrentUser(alarisEmployee.id);
  const alarisAircraft = db.getAircraftList();
  assert(
    alarisAircraft.every((a) => a.company_id === alarisCompany.id),
    `Alaris employee only sees aircraft belonging to Alaris (${alarisAircraft.map((a) => a.msn).join(', ')})`
  );
  assert(
    !alarisAircraft.some((a) => a.msn === '12347'),
    'Company B aircraft MSN 12347 is HIDDEN from Alaris employee'
  );

  const alarisTasks = db.getTasks();
  assert(
    alarisTasks.every((t) => t.company_id === alarisCompany.id),
    `Alaris employee only sees tasks belonging to Alaris (count: ${alarisTasks.length})`
  );
  assert(
    !alarisTasks.some((t) => t.aircraft?.msn === '12347'),
    'Company B tasks are HIDDEN from Alaris employee'
  );

  // 3. Create Aircraft in Alaris
  const newAlarisAc = await db.createAircraftWithLifecycle(
    {
      msn: '88801',
      registration: 'N888AA',
      aircraft_type: 'A320',
      model: 'A320-200',
      serial_number: 'MSN-88801-AIR',
      owner: 'Alaris Fleet',
      status: 'IN_PROGRESS',
      acquisition_date: '2026-09-21',
      location: 'MIA',
      current_stage_id: db.getStages()[0]?.id,
    },
    'blank'
  );
  assert(
    newAlarisAc.company_id === alarisCompany.id,
    `New aircraft created by Alaris employee automatically has company_id = Alaris (${newAlarisAc.company_id})`
  );

  // Add task to Alaris aircraft
  const newAlarisTask = db.createTask({
    aircraft_id: newAlarisAc.id,
    stage_id: db.getStages()[0]?.id || '',
    name: 'Alaris Confidential Inspection',
    status: 'NOT_STARTED',
    priority: 'HIGH',
  });
  assert(
    newAlarisTask.company_id === alarisCompany.id,
    `New task created under Alaris aircraft automatically inherits company_id = Alaris (${newAlarisTask.company_id})`
  );

  // 4. Company B Employee Isolation
  db.setCurrentUser(companyBEmployee.id);
  const companyBAircraft = db.getAircraftList();
  assert(
    companyBAircraft.every((a) => a.company_id === companyB.id),
    `Company B employee only sees Company B aircraft (${companyBAircraft.map((a) => a.msn).join(', ')})`
  );
  assert(
    !companyBAircraft.some((a) => a.msn === '88801' || a.msn === '12345' || a.msn === '12346'),
    'Alaris aircraft (12345, 12346, 88801) are completely INVISIBLE to Company B employee'
  );

  const companyBTasks = db.getTasks();
  assert(
    companyBTasks.every((t) => t.company_id === companyB.id),
    `Company B employee only sees Company B tasks (count: ${companyBTasks.length})`
  );
  assert(
    !companyBTasks.some((t) => t.name === 'Alaris Confidential Inspection'),
    'New task "Alaris Confidential Inspection" is completely INVISIBLE to Company B'
  );

  // Check direct lookup access denial
  const deniedAcLookup = db.getAircraftById(newAlarisAc.id);
  assert(
    deniedAcLookup === undefined,
    'Company B employee getAircraftById on Alaris aircraft returns undefined (Access Denied)'
  );

  // 5. Super Admin Company Filtering
  db.setCurrentUser(superAdmin.id);
  db.setSelectedCompanyFilter(companyB.id);
  const superAdminFilteredCompanyB = db.getAircraftList();
  assert(
    superAdminFilteredCompanyB.every((a) => a.company_id === companyB.id),
    `Super Admin filtering by Company B only sees Company B aircraft (${superAdminFilteredCompanyB.map((a) => a.msn).join(', ')})`
  );

  db.setSelectedCompanyFilter(alarisCompany.id);
  const superAdminFilteredAlaris = db.getAircraftList();
  assert(
    superAdminFilteredAlaris.every((a) => a.company_id === alarisCompany.id),
    `Super Admin filtering by Alaris only sees Alaris aircraft (${superAdminFilteredAlaris.map((a) => a.msn).join(', ')})`
  );

  // 6. Company Onboarding & Expiry Tests
  results.push('--- RUNNING ONBOARDING & CONTRACT EXPIRY TESTS ---');

  // Verify seed onboarding and expiry dates
  const alarisContract = db.getCompanyById(alarisCompany.id)!;
  assert(
    !!alarisContract.onboarding_date && !!alarisContract.expiry_date,
    `Alaris has onboarding date (${alarisContract.onboarding_date}) and expiry date (${alarisContract.expiry_date})`
  );
  assert(
    alarisContract.plan_tier === 'ENTERPRISE',
    `Alaris plan tier is ENTERPRISE (${alarisContract.plan_tier})`
  );

  // Test renewal
  const prevExpiry = alarisContract.expiry_date!;
  const renewRes = db.renewCompanyContract(alarisCompany.id, 1);
  assert(
    !renewRes.error && !!renewRes.company,
    `Contract renewed for Alaris, new expiry: ${renewRes.company?.expiry_date}`
  );
  assert(
    renewRes.company!.expiry_date! > prevExpiry,
    `New expiry date (${renewRes.company?.expiry_date}) is later than previous (${prevExpiry})`
  );

  // Test creation of custom company with custom onboarding & expiry
  const newCompRes = db.createCompany({
    name: 'Delta Jet Operations',
    email_domain: 'deltajet.com',
    onboarding_date: '2026-01-01',
    expiry_date: '2027-01-01',
    plan_tier: 'PROFESSIONAL',
    max_seats: 30,
    contact_person: 'David Miller',
    contact_email: 'dmiller@deltajet.com',
  });
  assert(
    !newCompRes.error && !!newCompRes.company,
    `Created new company "Delta Jet Operations" with custom onboarding (2026-01-01) and expiry (2027-01-01)`
  );
  assert(
    newCompRes.company?.max_seats === 30,
    `Delta Jet has max seats = 30`
  );

  // Test access validation on expired company
  const expiredCompRes = db.createCompany({
    name: 'Expired Airlines',
    email_domain: 'expiredair.com',
    onboarding_date: '2024-01-01',
    expiry_date: '2025-01-01', // Past date!
    status: 'ACTIVE',
  });
  const expiredAccessCheck = db.validateCompanyAccess('pilot@expiredair.com');
  assert(
    !expiredAccessCheck.authorized && !!expiredAccessCheck.error && expiredAccessCheck.error.includes('expired'),
    `Expired company user pilot@expiredair.com is denied access: "${expiredAccessCheck.error}"`
  );

  // 7. Fixed Email OTP (9876) Registration Verification
  results.push('--- RUNNING FIXED OTP (9876) REGISTRATION TESTS ---');

  // Test OTP dispatch for valid whitelisted corporate domain
  const validEmail = 'newhire@alarisaero.com';
  const otpRes = db.sendRegistrationOtp(validEmail, 'New Hire Employee');
  assert(
    otpRes.success === true && otpRes.fixedOtp === '9876',
    `OTP sent successfully for valid domain with fixed OTP = 9876 (got: ${otpRes.fixedOtp})`
  );

  // Check email outbox contains the verification email with 9876
  const emailLogs = db.getEmailLogs();
  const sentOtpEmail = emailLogs.find((e) => e.recipient_email === validEmail && e.trigger_event === 'REGISTRATION_OTP_SENT');
  assert(
    !!sentOtpEmail && sentOtpEmail.html_body.includes('9876'),
    `Verification email recorded in emailLogs with code 9876 for ${validEmail}`
  );

  // Test OTP rejection for unauthorized domain
  const invalidDomainEmail = 'attacker@external-domain.com';
  const invalidDomainRes = db.sendRegistrationOtp(invalidDomainEmail, 'External User');
  assert(
    invalidDomainRes.success === false && !!invalidDomainRes.error && invalidDomainRes.error.includes('not authorized'),
    `OTP request rejected for unauthorized domain ${invalidDomainEmail}: "${invalidDomainRes.error}"`
  );

  // Test OTP rejection for already registered email
  const existingUserEmail = 'john@alarisaero.com';
  const duplicateOtpRes = db.sendRegistrationOtp(existingUserEmail, 'John Duplicate');
  assert(
    duplicateOtpRes.success === false && !!duplicateOtpRes.error && duplicateOtpRes.error.includes('already exists'),
    `OTP request rejected for existing email ${existingUserEmail}: "${duplicateOtpRes.error}"`
  );

  // Test completing registration with valid details after OTP verification
  const registerRes = db.register({
    email: validEmail,
    full_name: 'New Hire Employee',
    job_title: 'Flight Line Engineer',
    department: 'Technical',
  });
  assert(
    registerRes.success === true && registerRes.user?.company_id === alarisCompany.id,
    `New employee registered successfully under Alaris after verifying OTP: ${registerRes.user?.full_name} (${registerRes.user?.email})`
  );

  // 8. Employee Addition by Colleagues & Task Assignment Tests
  results.push('--- RUNNING EMPLOYEE ADDITION & TASK ASSIGNMENT TESTS ---');

  // Switch to Alaris Employee
  db.setCurrentUser(alarisEmployee.id);

  // Test adding colleague with valid domain
  const colleagueEmail = 'robert@alarisaero.com';
  const addColleagueRes = db.addEmployeeByColleague({
    full_name: 'Robert Taylor',
    email: colleagueEmail,
    job_title: 'Teardown Specialist',
    department: 'Teardown',
  });
  assert(
    !addColleagueRes.error && !!addColleagueRes.profile,
    `Alaris employee successfully added colleague Robert Taylor (${colleagueEmail})`
  );
  assert(
    addColleagueRes.profile?.company_id === alarisCompany.id,
    `New colleague Robert Taylor automatically belongs to Alaris company (${addColleagueRes.profile?.company_id})`
  );
  assert(
    addColleagueRes.profile?.role === 'EMPLOYEE',
    `New colleague Robert Taylor has role = EMPLOYEE (${addColleagueRes.profile?.role})`
  );

  // Test rejection of non-matching domain
  const badDomainRes = db.addEmployeeByColleague({
    full_name: 'Rogue Employee',
    email: 'rogue@external.com',
  });
  assert(
    !!badDomainRes.error && badDomainRes.error.includes('authorized domain'),
    `Adding employee with wrong domain rejected: "${badDomainRes.error}"`
  );

  // Test rejection of duplicate email
  const duplicateColleagueRes = db.addEmployeeByColleague({
    full_name: 'Robert Duplicate',
    email: colleagueEmail,
  });
  assert(
    !!duplicateColleagueRes.error && duplicateColleagueRes.error.includes('already exists'),
    `Adding duplicate colleague rejected: "${duplicateColleagueRes.error}"`
  );

  // Test assigning task to the newly added employee
  const robertId = addColleagueRes.profile!.id;
  const assignedTask = db.assignTask(newAlarisTask.id, robertId);
  assert(
    assignedTask?.assigned_user_id === robertId,
    `Task "${newAlarisTask.name}" successfully assigned to Robert Taylor`
  );

  // Verify in-app notification created for Robert
  const robertNotifs = db.getNotifications(robertId);
  assert(
    robertNotifs.length > 0 && robertNotifs[0].type === 'TASK_ASSIGNED',
    `In-app notification created for Robert Taylor: "${robertNotifs[0]?.message}"`
  );

  // Verify simulated transactional email dispatched for Robert
  const allEmailLogs = db.getEmailLogs();
  const robertEmail = allEmailLogs.find(
    (e) => e.recipient_email === colleagueEmail && e.trigger_event === 'TASK_ASSIGNED'
  );
  assert(
    !!robertEmail && robertEmail.subject.includes(newAlarisTask.name),
    `Transactional assignment email recorded in emailLogs for ${colleagueEmail}`
  );

  // Test multi-tenant isolation of profiles
  db.setCurrentUser(companyBEmployee.id);
  const companyBProfiles = db.getProfiles();
  assert(
    !companyBProfiles.some((p) => p.email === colleagueEmail),
    `Company B employee cannot see Alaris colleague Robert Taylor in profiles (tenant isolation preserved)`
  );
  assert(
    companyBProfiles.every((p) => p.company_id === companyB.id),
    `Company B employee only sees Company B profiles (count: ${companyBProfiles.length})`
  );

  // Reset back to Super Admin default
  db.setSelectedCompanyFilter('ALL');
  db.setCurrentUser(superAdmin.id);

  results.push('--- ALL MULTI-TENANT ISOLATION, ONBOARDING, OTP & EMPLOYEE ASSIGNMENT TESTS COMPLETE ---');
  return { success: passed, results };
}

runTenantScopingTests().then((res) => {
  res.results.forEach((r) => console.log(r));
  if (!res.success) {
    process.exit(1);
  } else {
    console.log('\n>>> TENANT ISOLATION: ALL ASSERTIONS VERIFIED SUCCESSFULLY! <<<');
  }
});
