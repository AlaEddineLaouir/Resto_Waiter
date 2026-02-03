// Quick script to check what the roles API returns
async function main() {
  try {
    const res = await fetch('http://localhost:3001/api/admin/roles');
    if (!res.ok) {
      console.log('API returned error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    
    console.log('\n📋 Roles from API:\n');
    for (const role of data.roles || []) {
      console.log(`${role.name} (${role.slug})`);
      console.log(`  permissionKeys count: ${role.permissionKeys?.length || 0}`);
      if (role.permissionKeys?.length > 0) {
        console.log(`  Sample: ${role.permissionKeys.slice(0, 3).join(', ')}...`);
      }
      console.log('');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
