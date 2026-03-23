import { db } from './config/firebaseAdmin.js';

async function updateCoordinatorRole() {
  try {
    const email = 'job@123.com';
    console.log(`Searching for user with email: ${email}`);

    // Find user by email
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    if (usersSnapshot.size > 1) {
      console.error(`❌ Multiple users found with email ${email}`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log(`Found user: ${userData.name} (${userData.email})`);
    console.log(`Current role: ${userData.role || 'NOT SET'}`);

    // Update role to coordinator
    await userDoc.ref.update({
      role: 'coordinator'
    });

    console.log(`✅ Role updated to 'coordinator' successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateCoordinatorRole();
