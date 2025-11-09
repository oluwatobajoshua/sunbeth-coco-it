#!/usr/bin/env node
/*
 Promote a user to a role (default: Super Admin) by:
 1) Setting Firebase Auth custom claims { role }
 2) Upserting a Firestore users doc { email, role, name? }

 Usage examples:
   node scripts/promote-user.js --email oluwatoba.ogunsakin@sunbeth.net --role "Super Admin" --creds ./secrets/service-account.json
   node scripts/promote-user.js --email user@company.com --creds-b64 "<BASE64_OF_SERVICE_ACCOUNT_JSON>"
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('email', { type: 'string', demandOption: true })
  .option('role', { type: 'string', default: 'Super Admin' })
  .option('name', { type: 'string' })
  .option('creds', { type: 'string', describe: 'Path to service account JSON' })
  .option('creds-b64', { type: 'string', describe: 'Base64-encoded service account JSON' })
  .help()
  .argv;

function loadServiceAccount() {
  if (argv['creds-b64']) {
    const buf = Buffer.from(argv['creds-b64'], 'base64');
    return JSON.parse(buf.toString('utf-8'));
  }
  const p = argv.creds || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!p) throw new Error('Missing --creds or --creds-b64 or GOOGLE_APPLICATION_CREDENTIALS');
  const file = path.resolve(p);
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const svc = loadServiceAccount();
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(svc),
    });
  }
  const auth = admin.auth();
  const db = admin.firestore();

  const email = String(argv.email).trim();
  const role = String(argv.role).trim();
  const displayName = argv.name || email;

  console.log('Promoting user', { email, role });

  // 1) Ensure user exists in Firebase Auth (do not create if absent)
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (e) {
    console.error('Auth user not found. Create the user in your IdP/Auth first.', e.message || e);
    process.exit(2);
  }

  // 2) Set custom claims
  await auth.setCustomUserClaims(userRecord.uid, { role });
  console.log('Custom claims set');

  // 3) Upsert users docs with stable IDs so security rules can resolve them
  const payload = {
    email,
    role,
    name: displayName,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  const usersCol = db.collection('users');
  // a) users/{uid}
  await usersCol.doc(userRecord.uid).set({ ...payload }, { merge: true });
  // b) users/{email}
  await usersCol.doc(email.toLowerCase()).set({ ...payload }, { merge: true });
  console.log('Users directory updated (uid and email docs).')

  console.log('Done.');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
