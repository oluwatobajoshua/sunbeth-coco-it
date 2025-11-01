import React from 'react';

const read = (k) => process.env[k];
const isPlaceholder = (val) => !val || /your-|YOUR_|<|>/i.test(String(val));

const required = [
  'REACT_APP_MSAL_CLIENT_ID',
  // Tenant ID can be optional when using the 'common' authority
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_APP_ID',
];

const EnvWarning = () => {
  const [dismissed, setDismissed] = React.useState(false);
  const missing = required.filter(k => isPlaceholder(read(k)));

  if (dismissed || missing.length === 0) return null;

  return (
    <div className="container" style={{ marginBottom: 12 }}>
      <div className="card" style={{ padding: 12, borderLeft: '4px solid var(--accent, #f64500)' }}>
        <div className="d-flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="small" style={{ fontWeight: 600 }}>Environment configuration required</div>
            <div className="small">
              Missing or placeholder values detected for: {missing.join(', ')}. Create a real .env (not .env.example), fill these keys, then restart the dev server.
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => setDismissed(true)}><i className="fas fa-times"></i></button>
        </div>
      </div>
    </div>
  );
};

export default EnvWarning;
