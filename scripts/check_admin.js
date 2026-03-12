import { base44 } from '../src/api/base44Client.js';

async function listAdmins() {
  try {
    console.log("Listing admin users...");
    // Correct usage: base44.entities.<EntityName> (PascalCase matches definition)
    const response = await base44.entities.AdminUser.list();
    console.log("Full response:", response);
    console.log("Data:", response.data);
  } catch (error) {
    console.error("Failed to list admins:", error);
  }
}

listAdmins();
