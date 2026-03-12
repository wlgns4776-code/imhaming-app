import { base44 } from '../src/api/base44Client.js';

const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address: node scripts/add_admin.js <email>");
  process.exit(1);
}

async function addAdmin() {
  try {
    console.log(`Adding ${email} as admin...`);
    // Note: This script needs to run in an environment where base44 client can authenticate 
    // or use a service key if available. For local dev, it relies on local session.
    
    // Check if exists
    const { items } = await base44.collection('admin_user').list({
        filter: `email = "${email}"`
    });

    if (items.length > 0) {
        console.log("User is already an admin.");
        return;
    }

    await base44.collection('admin_user').create({ email });
    console.log("Admin added successfully.");
  } catch (error) {
    console.error("Failed to add admin:", error);
  }
}

addAdmin();
