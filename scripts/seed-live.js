#!/usr/bin/env node
/*
  Live seed script: stations, issueTypes, settings/app, settings/escalation, optional admin user.
  Uses Firebase Admin SDK and supports the same credential inputs as seed-demo.js

  Usage (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\secrets\\service-account.json"; node scripts/seed-live.js --project your-project-id --admin-email you@org.com --admin-role "Super Admin"
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const argv = process.argv.slice(2);
  const has = (k) => argv.includes(`--${k}`);
  const val = (k) => {
    const i = argv.indexOf(`--${k}`);
    if (i !== -1) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
    return undefined;
  };
  return {
    help: has('help') || has('h'),
    credsPath: val('creds'),
    project: val('project'),
    adminEmail: val('admin-email'),
    adminRole: val('admin-role') || 'Super Admin',
    bootstrap: val('bootstrap') // comma/semicolon separated list of super admin emails
  };
}

function printHelp() {
  console.log(`\nUsage: node scripts/seed-live.js [options]\n\nOptions:\n  --project <id>         Firebase projectId to target\n  --creds <path>         Path to service-account JSON (alternative to env vars)\n  --admin-email <email>  Create/merge a users doc with this email and role\n  --admin-role <role>    Role to assign (default: Super Admin)\n  --help, -h             Show this help\n`);
}

function loadCredentialAndProject({ credsPathArg, projectArg }) {
  let source = 'unknown';
  let keyObj = null;
  if (credsPathArg) {
    const abs = path.resolve(process.cwd(), credsPathArg);
    const raw = fs.readFileSync(abs, 'utf8');
    keyObj = JSON.parse(raw);
    source = `file:${abs}`;
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    keyObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    source = 'env:FIREBASE_SERVICE_ACCOUNT_JSON';
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    keyObj = JSON.parse(decoded);
    source = 'env:FIREBASE_SERVICE_ACCOUNT_BASE64';
  }
  let credential;
  if (keyObj) {
    credential = admin.credential.cert(keyObj);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
    source = `env:GOOGLE_APPLICATION_CREDENTIALS (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`;
  } else {
    console.error('Missing service account. Provide --creds or set FIREBASE_SERVICE_ACCOUNT_JSON | FIREBASE_SERVICE_ACCOUNT_BASE64 | GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
  const projectFromEnv = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const project = projectArg || projectFromEnv || (keyObj && keyObj.project_id) || undefined;
  return { credential, project, source };
}

async function upsert(docRef, data) {
  const snap = await docRef.get();
  if (snap.exists) { await docRef.set({ ...snap.data(), ...data }, { merge: true }); } else { await docRef.set(data, { merge: true }); }
}

async function main() {
  const args = parseArgs();
  if (args.help) { printHelp(); process.exit(0); }
  const { credential, project, source } = loadCredentialAndProject({ credsPathArg: args.credsPath, projectArg: args.project });
  const initOptions = project ? { credential, projectId: project } : { credential };
  admin.initializeApp(initOptions);
  const db = admin.firestore();

  // Seed stations
  const stations = [
    { id: 'coco-lagos-1', name: 'COCO Lagos Central' },
    { id: 'coco-abuja-1', name: 'COCO Abuja Main' },
    { id: 'coco-port-1', name: 'COCO Port Harcourt' },
    { id: 'coco-kano-1', name: 'COCO Kano Junction' },
    { id: 'coco-ibadan-1', name: 'COCO Ibadan Express' },
  ];
  for (const s of stations) { await upsert(db.collection('stations').doc(s.id), s); }

  // Seed issue types
  const types = [
    { key: 'electrical', label: 'Electrical', icon: 'bolt', active: true },
    { key: 'mechanical', label: 'Mechanical', icon: 'cog', active: true },
    { key: 'safety', label: 'Safety', icon: 'shield-alt', active: true },
    { key: 'equipment', label: 'Equipment', icon: 'wrench', active: true },
  ];
  // Upsert by stable id (key) to avoid duplicates when re-running
  for (const t of types) { await upsert(db.collection('issueTypes').doc(t.key), t); }

  // Seed app settings
  const appSettings = {
    maxPhotos: 3,
    maxPhotoSize: 5 * 1024 * 1024,
    csvExport: true,
    emailNotifications: true,
    smsNotifications: false,
    teamsNotifications: false,
    notificationEmails: ['engineering@cocostation.com'],
    slaByPriority: { low: 72, medium: 24, high: 4 },
    updatedAt: new Date(),
  };
  await upsert(db.collection('settings').doc('app'), appSettings);

  // Seed escalation settings
  const escalation = {
    enabled: false,
    channels: { email: true, sms: false, teams: false },
    targets: ['engineering@cocostation.com'],
    policy: { level1Minutes: 30, level2Minutes: 120 },
    updatedAt: new Date(),
  };
  await upsert(db.collection('settings').doc('escalation'), escalation);

  // Seed permissions matrix (used by Firestore rules for RBAC)
  const permissions = {
    station_manager: {
      view_dashboard: true,
      report_issue: true,
      manage_issues: true,
      manage_settings: false,
      view_admin: false,
      manage_stations: false,
      manage_issue_types: false,
      manage_users: false,
      debug_tools: false,
    },
    engineer: {
      view_dashboard: true,
      report_issue: true,
      manage_issues: true,
      manage_settings: false,
      view_admin: false,
      manage_stations: false,
      manage_issue_types: false,
      manage_users: false,
      debug_tools: false,
    },
    admin: {
      view_dashboard: true,
      report_issue: true,
      manage_issues: true,
      manage_settings: true,
      view_admin: true,
      manage_stations: true,
      manage_issue_types: true,
      manage_users: true,
      debug_tools: false,
    },
    super_admin: {
      view_dashboard: true,
      report_issue: true,
      manage_issues: true,
      manage_settings: true,
      view_admin: true,
      manage_stations: true,
      manage_issue_types: true,
      manage_users: true,
      debug_tools: true,
    },
  };
  await upsert(db.collection('settings').doc('permissions'), { matrix: permissions, updatedAt: new Date() });

  // Optional bootstrap super admins list (for rules-based bootstrap in dev)
  if (args.bootstrap) {
    const superAdmins = String(args.bootstrap)
      .split(/[;,]/)
      .map((s) => (s || '').trim().toLowerCase())
      .filter(Boolean);
    if (superAdmins.length) {
      await upsert(db.collection('settings').doc('bootstrap'), { super_admin_emails: superAdmins, updatedAt: new Date() });
    }
  }

  // Optional admin user: promote both by UID (if available) and by email doc for compatibility
  if (args.adminEmail) {
    const email = String(args.adminEmail).toLowerCase();
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord && userRecord.uid) {
        await upsert(db.collection('users').doc(userRecord.uid), { email, name: email, role: args.adminRole, updatedAt: new Date() });
      }
    } catch (_) {
      // User may not be in Firebase Auth yet; that's okay.
    }
    // Also write an email-keyed directory doc for legacy lookups
    await upsert(db.collection('users').doc(email), { email, name: email, role: args.adminRole, updatedAt: new Date() });
  }

  console.log(`\nSeed complete.\n  Project: ${project || '(from credential)'}\n  Credential: ${source}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
