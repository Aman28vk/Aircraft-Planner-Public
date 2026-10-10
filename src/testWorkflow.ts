import { WorkflowEngine } from './services/workflowEngine';
import {
  INITIAL_PROFILES,
  INITIAL_TEAMS,
  INITIAL_STAGES,
  INITIAL_AIRCRAFT,
  INITIAL_TASKS,
  INITIAL_DEPENDENCIES,
} from './services/seedData';
import { Task } from './types';

console.log('====================================================');
console.log('AIRCRAFT LIFECYCLE MANAGEMENT & TASK PLANNER');
console.log('Automated Workflow Engine & Dependency Test Suite');
console.log('====================================================\n');

// Clone initial state
let currentTasks: Task[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
const dependencies = INITIAL_DEPENDENCIES;
const aircraft = INITIAL_AIRCRAFT;
const profiles = INITIAL_PROFILES;
const teams = INITIAL_TEAMS;

// Find actors
const john = profiles.find((p) => p.email.startsWith('john'))!;
const aman = profiles.find((p) => p.email.startsWith('aman'))!;
const sarah = profiles.find((p) => p.email.startsWith('sarah'))!;

// Find tasks for MSN 12345
const task1 = currentTasks.find((t) => t.id === 't1111111-1111-1111-1111-111111111111')!; // Technical Acceptance
const task2 = currentTasks.find((t) => t.id === 't2222222-2222-2222-2222-222222222222')!; // Harvest List Preparation
const task3 = currentTasks.find((t) => t.id === 't3333333-3333-3333-3333-333333333333')!; // Teardown Coordination

console.log('STEP 0: Initial State Verification');
console.log(`Task 1: "${task1.name}" | Status: ${task1.status} | Assigned: John Smith`);
console.log(`Task 2: "${task2.name}" | Status: ${task2.status} | Assigned: Aman Kumar (Depends on Task 1)`);
console.log(`Task 3: "${task3.name}" | Status: ${task3.status} | Assigned: Sarah Connor (Depends on Task 2)`);

if (task1.status !== 'IN_PROGRESS' || task2.status !== 'WAITING' || task3.status !== 'WAITING') {
  console.error('FAILED: Initial status mismatch!');
  process.exit(1);
}
console.log('PASSED: Initial states match specification.\n');

// ---------------------------------------------------------
// STEP 1: John Smith completes Task 1: "Technical Acceptance"
// ---------------------------------------------------------
console.log('STEP 1: John Smith marks Task 1 ("Technical Acceptance") as COMPLETED');

const step1Result = WorkflowEngine.handleTaskCompletion(
  task1,
  john,
  currentTasks,
  dependencies,
  aircraft,
  profiles,
  teams
);

// Apply updates
task1.status = 'COMPLETED';
step1Result.updatedTasks.forEach((updated) => {
  const idx = currentTasks.findIndex((t) => t.id === updated.id);
  if (idx !== -1) currentTasks[idx] = updated;
});

const updatedTask2 = currentTasks.find((t) => t.id === task2.id)!;
console.log(`-> Task 1 Status: ${task1.status}`);
console.log(`-> Task 2 Status: ${updatedTask2.status} (Expected: READY)`);

if (updatedTask2.status !== 'READY') {
  console.error('FAILED: Task 2 did not transition to READY!');
  process.exit(1);
}
console.log('PASSED: Task 2 automatically unlocked to READY.');

// Verify In-App Notification for Aman
const amanNotif = step1Result.newNotifications.find((n) => n.user_id === aman.id);
if (!amanNotif) {
  console.error('FAILED: In-app notification for Aman not found!');
  process.exit(1);
}
console.log(`PASSED: In-App Notification created: "${amanNotif.subject}"`);

// Verify Email Log for Aman
const amanEmail = step1Result.newEmailLogs.find((e) => e.recipient_email === aman.email);
if (!amanEmail) {
  console.error('FAILED: Outgoing transactional email for Aman not found!');
  process.exit(1);
}
console.log(`PASSED: Email drafted for Aman:`);
console.log(`  Subject: ${amanEmail.subject}`);
console.log(`  To: ${amanEmail.recipient_name} <${amanEmail.recipient_email}>`);
console.log(`  Trigger Event: ${amanEmail.trigger_event}`);

// ---------------------------------------------------------
// STEP 2: Aman Kumar completes Task 2: "Harvest List Preparation"
// ---------------------------------------------------------
console.log('\nSTEP 2: Aman Kumar marks Task 2 ("Harvest List Preparation") as COMPLETED');

const step2Result = WorkflowEngine.handleTaskCompletion(
  updatedTask2,
  aman,
  currentTasks,
  dependencies,
  aircraft,
  profiles,
  teams
);

// Apply updates
updatedTask2.status = 'COMPLETED';
step2Result.updatedTasks.forEach((updated) => {
  const idx = currentTasks.findIndex((t) => t.id === updated.id);
  if (idx !== -1) currentTasks[idx] = updated;
});

const updatedTask3 = currentTasks.find((t) => t.id === task3.id)!;
console.log(`-> Task 2 Status: ${updatedTask2.status}`);
console.log(`-> Task 3 Status: ${updatedTask3.status} (Expected: READY)`);

if (updatedTask3.status !== 'READY') {
  console.error('FAILED: Task 3 did not transition to READY!');
  process.exit(1);
}
console.log('PASSED: Task 3 automatically unlocked to READY.');

// Verify In-App Notification for Sarah
const sarahNotif = step2Result.newNotifications.find((n) => n.user_id === sarah.id);
if (!sarahNotif) {
  console.error('FAILED: In-app notification for Sarah not found!');
  process.exit(1);
}
console.log(`PASSED: In-App Notification created: "${sarahNotif.subject}"`);

// Verify Email Log for Sarah
const sarahEmail = step2Result.newEmailLogs.find((e) => e.recipient_email === sarah.email);
if (!sarahEmail) {
  console.error('FAILED: Outgoing transactional email for Sarah not found!');
  process.exit(1);
}
console.log(`PASSED: Email drafted for Sarah:`);
console.log(`  Subject: ${sarahEmail.subject}`);
console.log(`  To: ${sarahEmail.recipient_name} <${sarahEmail.recipient_email}>`);
console.log(`  Trigger Event: ${sarahEmail.trigger_event}`);

console.log('\n====================================================');
console.log('ALL WORKFLOW & DEPENDENCY ENGINE TESTS PASSED! 100%');
console.log('====================================================');

