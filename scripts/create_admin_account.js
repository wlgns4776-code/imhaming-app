import { base44 } from '../src/api/base44Client.js';

const username = 'admin';
const password = 'a123@#';

async function createAdmin() {
  try {
    console.log(`Creating admin user: ${username}...`);
    
    // Check if exists
    // Correct usage: base44.entities.AdminUser.filter({ query })
    // And it returns the items array directly
    const items = await base44.entities.AdminUser.filter({ username });

    if (items.length > 0) {
        console.log("Admin user already exists. Updating password...");
        await base44.entities.AdminUser.update(items[0].id, { password });
        console.log("Password updated.");
        return;
    }

    await base44.entities.AdminUser.create({ username, password });
    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Failed to create admin:", error);
  }
}

createAdmin();
