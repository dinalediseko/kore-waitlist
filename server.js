require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'waitlist.json');

const FROM_EMAIL = process.env.FROM_EMAIL || "KORE by D'SEIKOU <onboarding@resend.dev>";

if (!process.env.RESEND_API_KEY) {
  console.warn('[warn] RESEND_API_KEY is not set. Confirmation emails will fail.');
}
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- Simple JSON file store (swap for a database in production) ---------- */

async function readWaitlist() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeWaitlist(list) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
}

/* ---------- Email templates ---------- */

function confirmationHtml() {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#EEEFEA;font-family:Helvetica,Arial,sans-serif;color:#0F0F0F;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEEFEA;">
      <tr>
        <td align="center" style="padding:56px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td align="center" style="font-family:Impact,'Arial Black',sans-serif;font-size:72px;line-height:1;color:#FBA516;letter-spacing:2px;">
                KORE
              </td>
            </tr>
            <tr>
              <td align="center" style="font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:8px 0 40px;">
                by D'SEIKOU
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.7;">
                <p style="margin:0 0 16px;font-weight:bold;">You're on the waitlist.</p>
                <p style="margin:0 0 16px;">
                  Every piece starts in the quiet space between imagination and creation.
                  Thank you for being one of the first to join us as we get ready to open our doors.
                </p>
                <p style="margin:0 0 16px;">
                  We'll reach out as soon as it's time, with early access details.
                </p>
                <p style="margin:0 0 16px;">
                  Made with intention. Made by hand. Made for you.
                </p>
                <p style="margin:32px 0 0;">With gratitude,<br />D'SEIKOU</p>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#6b6b6b;padding-top:40px;border-top:1px solid #d6d6d0;margin-top:40px;">
                Because some things aren't meant to be replaced. They're meant to be inherited.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function confirmationText() {
  return `You're on the KORE waitlist.

Every piece starts in the quiet space between imagination and creation. Thank you for being one of the first to join us as we get ready to open our doors.

We'll reach out as soon as it's time, with early access details.

Made with intention. Made by hand. Made for you.

With gratitude,
D'SEIKOU

Because some things aren't meant to be replaced. They're meant to be inherited.`;
}

/* ---------- Routes ---------- */

app.post('/api/waitlist', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const list = await readWaitlist();

    if (list.some((entry) => entry.email === email)) {
      return res.json({
        message: "You're already on the waitlist. We'll be in touch soon.",
        alreadyJoined: true,
      });
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You're on the KORE waitlist",
      html: confirmationHtml(),
      text: confirmationText(),
    });

    if (error) {
      throw new Error(error.message || 'Resend returned an error');
    }

    list.push({ email, joinedAt: new Date().toISOString() });
    await writeWaitlist(list);

    return res.status(201).json({
      message: 'Check your inbox. Your confirmation is on its way.',
    });
  } catch (err) {
    console.error('Waitlist error:', err);
    return res.status(500).json({
      error: 'We could not add you right now. Please try again in a moment.',
    });
  }
});

app.get('/api/waitlist/count', async (_req, res) => {
  const list = await readWaitlist();
  res.json({ count: list.length });
});

app.listen(PORT, () => {
  console.log(`KORE coming soon running at http://localhost:${PORT}`);
});
