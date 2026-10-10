async function test() {
  console.log('Testing GET http://localhost:5173/api/db/init ...');
  const res = await fetch('http://localhost:5173/api/db/init');
  console.log('Response status:', res.status);
  const data = await res.json();
  console.log('Init success:', data.success);
  console.log('Aircraft count from Supabase:', data.data?.aircraft?.length);
  console.log('Aircraft MSNs:', data.data?.aircraft?.map((a: any) => a.msn));

  console.log('\nTesting POST http://localhost:5173/api/db/mutate (adding new aircraft)...');
  const testAc = {
    id: 'a-bridge-test-' + Date.now(),
    company_id: 'c1111111-1111-1111-1111-111111111111',
    msn: '99881',
    registration: 'N998AL',
    aircraft_type: 'A320',
    model: 'A320-200',
    variant: 'CFM56',
    serial_number: 'SN-99881',
    owner: 'Alaris Fleet Operations',
    status: 'ACTIVE',
    acquisition_date: null,
    expected_teardown_date: null,
    actual_teardown_date: null,
    location: 'Chicago (ORD)',
    current_stage_id: 's1111111-1111-1111-1111-111111111111',
    notes: 'Aircraft added via DB bridge API test',
    created_by: '11111111-1111-1111-1111-111111111111',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mutateRes = await fetch('http://localhost:5173/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'aircraft',
      action: 'insert',
      payload: testAc,
      matchKey: 'id',
    }),
  });

  console.log('Mutate status:', mutateRes.status);
  const mutateJson = await mutateRes.json();
  console.log('Mutate response:', mutateJson);

  // Read back to confirm it is actually in the Supabase database!
  const verifyRes = await fetch('http://localhost:5173/api/db/init');
  const verifyData = await verifyRes.json();
  const found = verifyData.data?.aircraft?.find((a: any) => a.id === testAc.id);
  console.log('\nVerifying new aircraft in Supabase database:');
  console.log(found ? `✓ SUCCESS! Found MSN: ${found.msn}, Model: ${found.model}, Reg: ${found.registration}` : '✗ FAILED to find in Supabase!');

  // Cleanup
  console.log('\nCleaning up test aircraft...');
  await fetch('http://localhost:5173/api/db/mutate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: 'aircraft',
      action: 'delete',
      payload: testAc.id,
      matchKey: 'id',
    }),
  });
  console.log('✓ Cleanup complete.');
}

test().catch(console.error);

