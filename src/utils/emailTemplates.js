// HTML email templates for notifications (inline CSS for client compatibility)

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export function buildIssueReportedEmail(issue, opts = {}) {
  const {
    companyName = 'Sunbeth Energies',
    brandColor = '#0c5343',
    accentColor = '#f64500',
    brandLogoUrl = null,
    appUrl = process.env.REACT_APP_APP_URL || ''
  } = opts;

  const id = escapeHtml(issue.id);
  const station = escapeHtml(issue.stationId);
  const type = escapeHtml(issue.issueType);
  const priority = escapeHtml((issue.priority || '').toUpperCase());
  const description = escapeHtml(issue.description);
  const reporterName = escapeHtml(issue.reporterName || '—');
  const reporterEmail = escapeHtml(issue.reporterId || '—');
  const createdAt = new Date().toLocaleString();
  const photos = Array.isArray(issue.photos) ? issue.photos : [];
  const assignedTo = Array.isArray(issue.assignedTo) ? issue.assignedTo : [];
  const cc = Array.isArray(issue.cc) ? issue.cc : [];

  const subject = `[${companyName}] New Issue ${id} — ${type} at ${station}`;

  const logoBlock = brandLogoUrl
    ? `<tr><td style="padding:16px 24px 0 24px;text-align:center"><img src="${brandLogoUrl}" alt="${companyName}" style="max-width:200px;height:auto;border:0;outline:none;text-decoration:none"/></td></tr>`
    : '';

  const photoList = photos.length
    ? `<tr><td style="padding:12px 24px 0 24px"><div style="font-weight:600;color:${brandColor};margin-bottom:8px">Photos</div>
        <div>${photos.map((p, i) => `<a href="${p.url}" style="display:inline-block;margin-right:8px;color:${accentColor};text-decoration:none">Photo ${i + 1}</a>`).join('')}</div>
      </td></tr>`
    : '';

  const assignedList = assignedTo.length ? assignedTo.join(', ') : '—';
  const ccList = cc.length ? cc.join(', ') : '—';
  const viewLink = appUrl ? `${appUrl}/issues/${encodeURIComponent(id)}` : '#';

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#222">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f8fa">
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" align="center" style="margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6eaef">
            <tr>
              <td style="padding:12px 24px;background:${brandColor};color:#fff;font-weight:600;font-size:16px">
                ${companyName}
              </td>
            </tr>
            ${logoBlock}
            <tr>
              <td style="padding:16px 24px 0 24px">
                <div style="font-weight:700;font-size:18px;margin-bottom:4px">New Issue Reported</div>
                <div style="color:#64748b;font-size:13px">Issue ID <span style="font-weight:600;color:${brandColor}">${id}</span> • ${createdAt}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px">
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">Station</td>
                    <td style="padding:8px 0;font-weight:600">${station}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">Type</td>
                    <td style="padding:8px 0;font-weight:600">${type}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">Priority</td>
                    <td style="padding:8px 0"><span style="display:inline-block;background:${accentColor};color:#fff;border-radius:999px;padding:2px 10px;font-weight:700">${priority}</span></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">Reporter</td>
                    <td style="padding:8px 0">${reporterName} &lt;${reporterEmail}&gt;</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b;vertical-align:top">Description</td>
                    <td style="padding:8px 0;line-height:1.5">${description}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">Assigned To</td>
                    <td style="padding:8px 0">${assignedList}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;width:160px;color:#64748b">CC</td>
                    <td style="padding:8px 0">${ccList}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${photoList}
            <tr>
              <td style="padding:20px 24px 28px 24px">
                <a href="${viewLink}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">View Issue</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 24px;background:#f0f3f6;color:#64748b;font-size:12px">
                <div style="font-weight:600;color:${brandColor}">${companyName}</div>
                <div>This is an automated message. Please do not reply.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const text = `New Issue Reported\n\n` +
    `Issue ID: ${id}\n` +
    `Station: ${station}\n` +
    `Type: ${type}\n` +
    `Priority: ${priority}\n` +
    `Reporter: ${reporterName} <${reporterEmail}>\n` +
    `Assigned To: ${assignedList}\n` +
    `CC: ${ccList}\n` +
    `Description: ${issue.description}\n` +
    (photos.length ? `Photos: ${photos.map(p => p.url).join(', ')}\n` : '') +
    (appUrl ? `View: ${appUrl}/issues/${id}\n` : '');

  return { subject, html, text };
}

// No default export to keep tree-shaking clean
