import { db, DEFAULT_RO_COLUMNS } from './services/storage';
import { RepairOrderColumn } from './types';
import * as XLSX from 'xlsx';
import { parseAndValidateExcel, normalizeHeader } from './utils/excelHelper';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING REPAIR ORDERS (RO) MODULE TESTS ---');

  // Test 1: User & Tenant Scoping
  console.log('\n--- 1. TESTING USER & TENANT ISOLATION ---');
  // Log in as Aman (Alaris Employee)
  const amanLogin = db.login('aman@alarisaero.com', 'password123');
  assert(amanLogin.success, 'Aman logged in successfully');
  const amanUser = db.getCurrentUser();
  assert(amanUser?.email === 'aman@alarisaero.com', 'Current user is Aman');

  const amanROs = db.getRepairOrders();
  assert(amanROs.length > 0, `Aman has initial seed ROs (count: ${amanROs.length})`);
  assert(amanROs.every((r) => r.user_id === amanUser?.id), 'All ROs returned belong strictly to Aman');

  // Log in as John (Alaris Employee)
  const johnLogin = db.login('john@alarisaero.com', 'password123');
  assert(johnLogin.success, 'John logged in successfully');
  const johnUser = db.getCurrentUser();
  assert(johnUser?.email === 'john@alarisaero.com', 'Current user is John');

  const johnROs = db.getRepairOrders();
  assert(johnROs.length > 0, `John has separate seed ROs (count: ${johnROs.length})`);
  assert(johnROs.every((r) => r.user_id === johnUser?.id), 'All ROs returned belong strictly to John');

  // Verify Aman's ROs and John's ROs do not overlap
  const amanRoIds = new Set(amanROs.map((r) => r.id));
  const hasOverlap = johnROs.some((r) => amanRoIds.has(r.id));
  assert(!hasOverlap, 'Zero overlap between Aman ROs and John ROs (Isolated per member)');

  // Test 2: Dynamic Column Customization per Member
  console.log('\n--- 2. TESTING DYNAMIC COLUMN CUSTOMIZATION ---');
  // Aman customizes columns: adds "Work Order Ref"
  db.login('aman@alarisaero.com', 'password123');
  const amanDefaultCols = db.getRepairOrderColumns(amanUser?.id);
  assert(amanDefaultCols.length === DEFAULT_RO_COLUMNS.length, `Aman has default columns initially (${amanDefaultCols.length})`);

  const customCol: RepairOrderColumn = {
    id: 'col_work_order_ref',
    name: 'Work Order Ref',
    type: 'text',
    required: false,
    order: amanDefaultCols.length + 1,
  };

  const updatedAmanCols = db.saveRepairOrderColumns(amanUser!.id, [...amanDefaultCols, customCol]);
  assert(updatedAmanCols.length === amanDefaultCols.length + 1, 'Aman column count increased by 1');
  assert(updatedAmanCols.some((c) => c.name === 'Work Order Ref'), 'Aman table includes "Work Order Ref"');

  // Verify John's table does NOT have "Work Order Ref"
  const johnCols = db.getRepairOrderColumns(johnUser?.id);
  assert(!johnCols.some((c) => c.name === 'Work Order Ref'), 'John does NOT have Aman custom column (Columns isolated per member)');

  // Test 3: Manual Addition, Updating & Deleting RO
  console.log('\n--- 3. TESTING MANUAL ADD, UPDATE & DELETE ---');
  db.login('aman@alarisaero.com', 'password123');
  const newRo = db.addRepairOrder({
    ro_number: 'RO-9901',
    part_number: 'CFM-99120-01',
    description: 'CFM56 Low Pressure Turbine Stator',
    serial_number: 'SN-77881',
    vendor: 'Delta TechOps',
    status: 'Quote Requested',
    date_sent: '2026-03-20',
    est_cost: 7500,
    col_work_order_ref: 'WO-88402',
  });

  assert(newRo.id !== undefined, 'New RO created with unique ID');
  assert(newRo.data.ro_number === 'RO-9901', 'RO number saved correctly');
  assert(newRo.data.col_work_order_ref === 'WO-88402', 'Custom column value saved correctly');

  // Update RO
  const updatedRo = db.updateRepairOrder(newRo.id, {
    status: 'In Inspection',
    est_cost: 8200,
  });
  assert(updatedRo.data.status === 'In Inspection', 'RO status updated to "In Inspection"');
  assert(updatedRo.data.est_cost === 8200, 'RO est_cost updated to 8200');

  // Test 3B: Dynamic Column Renaming & Data Preservation
  console.log('\n--- 3B. TESTING COLUMN RENAMING & DATA PRESERVATION ---');
  // Rename "Work Order Ref" to "WO Reference"
  const renamedCols = updatedAmanCols.map((c) =>
    c.id === 'col_work_order_ref' ? { ...c, name: 'WO Reference' } : c
  );
  db.saveRepairOrderColumns(amanUser!.id, renamedCols);
  const fetchedRenamedCols = db.getRepairOrderColumns(amanUser?.id);
  const targetCol = fetchedRenamedCols.find((c) => c.id === 'col_work_order_ref');
  assert(targetCol?.name === 'WO Reference', 'Column renamed to "WO Reference" while retaining col_work_order_ref ID');
  assert(newRo.data.col_work_order_ref === 'WO-88402', 'Existing row data for col_work_order_ref remains completely intact');

  // Test 3C: Column Removal with Historical Data Preservation
  console.log('\n--- 3C. TESTING COLUMN REMOVAL & HISTORICAL PRESERVATION ---');
  // Remove "WO Reference" from active columns
  const colsWithoutWO = fetchedRenamedCols.filter((c) => c.id !== 'col_work_order_ref');
  db.saveRepairOrderColumns(amanUser!.id, colsWithoutWO);
  const activeColsAfterRemove = db.getRepairOrderColumns(amanUser?.id);
  assert(!activeColsAfterRemove.some((c) => c.id === 'col_work_order_ref'), 'col_work_order_ref is removed from active columns');

  // Verify that an update to the RO still preserves the historical col_work_order_ref data in DB
  const updatedAfterRemove = db.updateRepairOrder(newRo.id, {
    status: 'Shipped / In Transit',
  });
  assert(updatedAfterRemove.data.status === 'Shipped / In Transit', 'RO status updated');
  assert(
    updatedAfterRemove.data.col_work_order_ref === 'WO-88402',
    'Historical data for removed column col_work_order_ref is strictly preserved in database record'
  );

  // Restore the column to active for subsequent Excel tests
  db.saveRepairOrderColumns(amanUser!.id, updatedAmanCols);

  // Delete RO
  const deleteSuccess = db.deleteRepairOrder(newRo.id);
  assert(deleteSuccess, 'RO deleted successfully');
  const remainingAmanROs = db.getRepairOrders(amanUser?.id);
  assert(!remainingAmanROs.some((r) => r.id === newRo.id), 'Deleted RO is no longer in Aman list');

  // Test 4: Excel Strict Column Matching Validation
  console.log('\n--- 4. TESTING EXCEL STRICT COLUMN MATCHING ---');

  // Test 4A: Missing columns should REJECT
  const invalidHeaders = ['RO Number', 'Part Number', 'Description']; // Missing 9+ active columns
  const invalidWorksheet = XLSX.utils.aoa_to_sheet([invalidHeaders, ['RO-101', 'PN-01', 'Sample Desc']]);
  const invalidWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(invalidWorkbook, invalidWorksheet, 'Sheet1');
  const invalidBuffer = XLSX.write(invalidWorkbook, { type: 'buffer', bookType: 'xlsx' });

  // Simulate File object using Blob/Uint8Array
  const invalidFile = new File([invalidBuffer], 'invalid_columns.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const invalidResult = await parseAndValidateExcel(invalidFile, updatedAmanCols);
  assert(!invalidResult.valid, 'Excel with missing columns correctly REJECTED');
  assert(invalidResult.missingColumns.length > 0, `Detected ${invalidResult.missingColumns.length} missing columns`);
  assert(invalidResult.errorMessage !== undefined, 'Clear error message returned explaining mismatch');

  // Test 4B: All columns matching should ACCEPT
  const validHeaders = updatedAmanCols.map((c) => c.name);
  const sampleRow1 = updatedAmanCols.map((c) => {
    if (c.name === 'RO Number') return 'RO-BULK-01';
    if (c.name === 'Part Number') return 'PART-BULK-01';
    if (c.name === 'Description') return 'Bulk Imported Component';
    if (c.name === 'Status') return 'Sent to Vendor';
    if (c.type === 'currency' || c.type === 'number') return 3500;
    return 'Valid Data';
  });
  const sampleRow2 = updatedAmanCols.map((c) => {
    if (c.name === 'RO Number') return 'RO-BULK-02';
    if (c.name === 'Part Number') return 'PART-BULK-02';
    if (c.name === 'Description') return 'Second Bulk Component';
    if (c.name === 'Status') return 'Completed';
    if (c.type === 'currency' || c.type === 'number') return 5200;
    return 'Valid Data 2';
  });

  const validWorksheet = XLSX.utils.aoa_to_sheet([validHeaders, sampleRow1, sampleRow2]);
  const validWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(validWorkbook, validWorksheet, 'Repair Orders');
  const validBuffer = XLSX.write(validWorkbook, { type: 'buffer', bookType: 'xlsx' });

  const validFile = new File([validBuffer], 'valid_columns.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const validResult = await parseAndValidateExcel(validFile, updatedAmanCols);
  assert(validResult.valid, 'Excel with 100% matched columns ACCEPTED');
  assert(validResult.totalRows === 2, `Parsed exactly 2 rows (got: ${validResult.totalRows})`);
  assert(validResult.parsedRows[0]['ro_number'] === 'RO-BULK-01', 'First row ro_number correctly mapped to column ID');

  // Test 4C: Bulk Import Execution
  const preImportCount = db.getRepairOrders(amanUser?.id).length;
  const importResult = db.bulkImportRepairOrders(amanUser!.id, validResult.parsedRows, 'append');
  assert(importResult.importedCount === 2, 'Imported 2 rows in append mode');
  const postImportCount = db.getRepairOrders(amanUser?.id).length;
  assert(postImportCount === preImportCount + 2, `Total RO count increased by 2 (now: ${postImportCount})`);

  console.log('\n--- ALL REPAIR ORDERS MODULE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

