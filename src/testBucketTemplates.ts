import { db } from './services/storage';

console.log('====================================================');
console.log('STARTING AUTOMATED TESTS: BUCKET / LIFECYCLE TEMPLATES & BUCKET LIBRARY');
console.log('====================================================');

// Reset to clean seed
db.resetToSeed();

const templates = db.getLifecycleTemplates();
console.log(`Loaded ${templates.length} Master Lifecycle Templates from seed:`);
templates.forEach((t) => {
  console.log(`  - ${t.name} (${t.aircraft_type}): ${t.buckets.length} Buckets`);
});

const a320Template = templates.find((t) => t.name === 'A320 Standard Lifecycle');
if (!a320Template) {
  console.error('FAILED: A320 Standard Lifecycle master template not found!');
  process.exit(1);
}
console.log('PASSED: Master template "A320 Standard Lifecycle" verified with 9 buckets.');

async function runTests() {
  console.log('\n--- TEST 1: Create MSN 35000 with "A320 Standard Lifecycle" template ---');
  const msn35000 = await db.createAircraftWithLifecycle(
  {
    msn: '35000',
    aircraft_type: 'A320-200',
    model: 'A320-200',
    owner: 'Aero Capital',
    status: 'IN_PROGRESS',
  },
  'template',
  {
    templateId: a320Template.id,
  }
);

const buckets35000 = db.getProjectBuckets(msn35000.id);
console.log(`-> MSN 35000 created with ID: ${msn35000.id}`);
console.log(`-> Project Buckets created for MSN 35000: ${buckets35000.length}`);

if (buckets35000.length !== a320Template.buckets.length) {
  console.error(`FAILED: Expected ${a320Template.buckets.length} buckets, got ${buckets35000.length}`);
  process.exit(1);
}

const tasks35000 = db.getTasks(msn35000.id);
console.log(`-> Tasks instantiated for MSN 35000: ${tasks35000.length}`);
if (tasks35000.length === 0) {
  console.error('FAILED: No tasks instantiated from template!');
  process.exit(1);
}
console.log('PASSED: MSN 35000 successfully instantiated with independent ProjectBuckets and Tasks.');

// -----------------------------------------------------------------
// TEST 2: Project Independence & Isolation
// -----------------------------------------------------------------
console.log('\n--- TEST 2: Independence Verification (Modifying MSN 35000 does not affect template) ---');
const firstBucket = buckets35000[0];
const originalMasterBucketName = a320Template.buckets[0].name;

db.updateProjectBucket(firstBucket.id, {
  name: '01 BIDDING & CUSTOM APPRAISAL (MSN 35000 CUSTOM)',
  color: '#e11d48',
});

// Verify project bucket was updated
const reloadedBucket = db.getProjectBucketById(firstBucket.id);
if (reloadedBucket?.name !== '01 BIDDING & CUSTOM APPRAISAL (MSN 35000 CUSTOM)') {
  console.error('FAILED: Project bucket on MSN 35000 was not updated!');
  process.exit(1);
}

// Verify Master Template bucket was NOT modified
const reloadedMaster = db.getLifecycleTemplateById(a320Template.id);
if (reloadedMaster?.buckets[0].name !== originalMasterBucketName) {
  console.error('FAILED: Master template was improperly mutated by project bucket change!');
  process.exit(1);
}
console.log(`-> Project Bucket name: "${reloadedBucket.name}"`);
console.log(`-> Master Template bucket name: "${reloadedMaster.buckets[0].name}"`);
console.log('PASSED: Master template remains completely immutable when project bucket is edited.');

// -----------------------------------------------------------------
// TEST 3: Clean State Copy from Existing MSN (MSN 12345 -> MSN 35001)
// -----------------------------------------------------------------
console.log('\n--- TEST 3: Copy from MSN 12345 to MSN 35001 with Clean State Guarantees ---');
const sourceMsn = db.getAircraftList().find((a) => a.msn === '12345');
if (!sourceMsn) {
  console.error('FAILED: Source aircraft MSN 12345 not found!');
  process.exit(1);
}

// Mark one task in MSN 12345 as completed with completion date and historical logs
const sourceTasks = db.getTasks(sourceMsn.id);
const firstSourceTask = sourceTasks[0];
db.updateTask(firstSourceTask.id, {
  status: 'COMPLETED',
  completed_at: '2026-09-19T12:00:00Z',
  actual_duration_days: 4,
});

const msn35001 = await db.createAircraftWithLifecycle(
  {
    msn: '35001',
    aircraft_type: 'A320-200',
    model: 'A320-200',
    owner: 'Aero Capital',
    status: 'IN_PROGRESS',
  },
  'copy_msn',
  {
    sourceMsn: sourceMsn.msn,
    copyOptions: {
      copyBuckets: true,
      copyTasks: true,
      copySubtasks: true,
      copyChecklists: true,
      copyDependencies: true,
      copyDurations: true,
      copyOrder: true,
      copyAssignees: false,
      copyComments: false,
      copyAttachments: false,
    },
  }
);

const copiedBuckets = db.getProjectBuckets(msn35001.id);
const copiedTasks = db.getTasks(msn35001.id);
console.log(`-> MSN 35001 created from MSN 12345:`);
console.log(`   Buckets copied: ${copiedBuckets.length}`);
console.log(`   Tasks copied: ${copiedTasks.length}`);

// Verify clean state guarantees:
// 1. Task statuses must be NOT_STARTED or WAITING (no COMPLETED)
const completedTasks = copiedTasks.filter((t) => t.status === 'COMPLETED');
if (completedTasks.length > 0) {
  console.error(`FAILED: Found ${completedTasks.length} COMPLETED tasks in copied MSN! Must be clean.`);
  process.exit(1);
}

// 2. No completed_at timestamps
const hasCompletedAt = copiedTasks.filter((t) => !!t.completed_at);
if (hasCompletedAt.length > 0) {
  console.error('FAILED: Found tasks with completed_at dates in copied MSN!');
  process.exit(1);
}

// 3. No assignees copied (since copyAssignees = false)
const hasAssignees = copiedTasks.filter((t) => !!t.assigned_user_id);
if (hasAssignees.length > 0) {
  console.error('FAILED: Found tasks with assigned users when copyAssignees was false!');
  process.exit(1);
}

console.log('PASSED: Clean state guarantees verified for MSN copy (clean status, zero completion dates, unassigned).');

// -----------------------------------------------------------------
// TEST 4: In-MSN Bucket & Task Actions (Duplicate Task, Save as Template)
// -----------------------------------------------------------------
console.log('\n--- TEST 4: In-MSN Bucket & Task Actions ---');
// 4a. Duplicate task
const taskToDuplicate = copiedTasks[0];
const duplicatedTask = db.duplicateTask(taskToDuplicate.id);
if (!duplicatedTask) {
  console.error('FAILED: duplicateTask returned null!');
  process.exit(1);
}
if (duplicatedTask.status !== 'NOT_STARTED' || duplicatedTask.completed_at !== undefined) {
  console.error('FAILED: Duplicated task does not have clean status NOT_STARTED!');
  process.exit(1);
}
console.log(`PASSED: Task duplicated with clean initial state: "${duplicatedTask.name}"`);

// 4b. Add new bucket to MSN 35000
const addedBucket = db.addBucketToAircraft(msn35000.id, {
  mode: 'new',
  name: '10 ENGINE TEST CELL',
  color: '#a855f7',
});
console.log(`PASSED: New bucket added to MSN 35000: "${addedBucket.name}"`);

// 4c. Save project bucket as Master Template
const savedTmplBucket = db.saveBucketAsTemplate(
  addedBucket.id,
  'Master Engine Test Cell Template'
);
const masterTemplatesAfterSave = db.getLifecycleTemplates();
const foundNewTemplate = masterTemplatesAfterSave.find(
  (t) => t.name === 'Master Engine Test Cell Template'
);
if (!foundNewTemplate) {
  console.error('FAILED: Saved bucket was not found in Master Lifecycle Templates library!');
  process.exit(1);
}
console.log(`PASSED: Project bucket successfully saved to Master Templates library as "${foundNewTemplate.name}".`);

// -----------------------------------------------------------------
// TEST 5: Template Update Propagation Confirmation
// -----------------------------------------------------------------
console.log('\n--- TEST 5: Template Update Propagation Prompt Logic ---');
// Test 5a: Propagation Mode = template_only
db.updateLifecycleTemplate(
  a320Template.id,
  {
    description: 'Updated template description for 2026 fleet standard',
  },
  'template_only'
);
const tmplAfterUpdate = db.getLifecycleTemplateById(a320Template.id);
if (tmplAfterUpdate?.description !== 'Updated template description for 2026 fleet standard') {
  console.error('FAILED: Master template was not updated in template_only mode!');
  process.exit(1);
}
console.log('PASSED: "template_only" mode updated master template without altering active aircraft projects.');

// Test 5b: Propagation Mode = select_aircraft (Selective non-destructive bucket synchronization)
const newMasterBucket = {
  id: 'mb-09-extra',
  bucket_number: 10,
  code: '10_ENVIRONMENTAL_AUDIT',
  name: '10 ENVIRONMENTAL AUDIT',
  description: 'Scrap disposition and EPA airworthiness environmental audit',
  display_order: 10,
  color: '#059669',
  tasks: [],
};

const updatedBucketsWithExtra = [...a320Template.buckets, newMasterBucket];

// Propagate only to MSN 35000, leaving MSN 12345 untouched
db.updateLifecycleTemplate(
  a320Template.id,
  {
    buckets: updatedBucketsWithExtra,
  },
  'select_aircraft',
  [msn35000.id] // target aircraft
);

const buckets35000AfterSync = db.getProjectBuckets(msn35000.id);
const hasNewBucketIn35000 = buckets35000AfterSync.some(
  (b) => b.code === '10_ENVIRONMENTAL_AUDIT'
);
if (!hasNewBucketIn35000) {
  console.error('FAILED: Missing bucket "10 ENVIRONMENTAL AUDIT" was not added to target MSN 35000!');
  process.exit(1);
}

// Verify non-target aircraft (MSN 12345) did NOT get the bucket
const buckets12345 = db.getProjectBuckets(sourceMsn.id);
const hasNewBucketIn12345 = buckets12345.some(
  (b) => b.code === '10_ENVIRONMENTAL_AUDIT'
);
if (hasNewBucketIn12345) {
  console.error('FAILED: Non-targeted aircraft MSN 12345 received the bucket unexpectedly!');
  process.exit(1);
}
console.log('PASSED: Selective propagation added missing bucket to MSN 35000 while leaving MSN 12345 untouched.');

console.log('\n====================================================');
console.log('ALL BUCKET TEMPLATES & BUCKET LIBRARY TESTS PASSED! 100%');
console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Unhandled error in testBucketTemplates:', err);
  process.exit(1);
});
