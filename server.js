
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'waitlist.json');

const FROM_EMAIL =
  process.env.FROM_EMAIL ||
  "KORÉ by D'SEIKOU <kore@dseikou.co.za>";

// Resend is optional so the website can run locally without an API key.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

if (!resend) {
  console.warn(
    '[warn] Resend is disabled. Email signup is unavailable until configured.'
  );
}

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- Local JSON waitlist storage ---------- */

async function readWaitlist() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const list = JSON.parse(raw);

    if (!Array.isArray(list)) {
      throw new Error('Waitlist data must be a JSON array.');
    }

    return list;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }

    throw err;
  }
}

async function writeWaitlist(list) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

/* ---------- Email templates ---------- */

function confirmationHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to KORÉ</title>
  </head>
  <body style="margin:0;padding:0;background:#EEEFEA;font-family:Helvetica,Arial,sans-serif;color:#0F0F0F;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEEFEA;">
      <tr>
        <td align="center" style="padding:56px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td align="center" style="font-family:Impact,'Arial Black',sans-serif;font-size:72px;line-height:1;color:#FBA516;letter-spacing:2px;">
                KORÉ
              </td>
            </tr>
            <tr>
              <td align="center" style="font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:8px 0 40px;">
                by D'SEIKOU
              </td>
            </tr>
            <tr>
              <td style="font-size:16px;line-height:1.7;">
                <p style="margin:0 0 16px;font-weight:bold;">
                  You're on the waitlist.
                </p>
                <p style="margin:0 0 16px;">
                  Every piece starts in the quiet space between imagination and creation.
                  Thank you for being one of the first to join us as we get ready to open our doors.
                </p>
                <p style="margin:0 0 16px;">
                  We'll reach out as soon as it's time, with early access details.
                </p>
                <p style="margin:0 0 16px;">
                  Made with intention. Made by hand. Made for you by D'SEIKOU.
                </p>
                <p style="margin:32px 0 0;">
                  With gratitude,<br>
                  D'SEIKOU
                </p>
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#6b6b6b;padding-top:40px;border-top:1px solid #d6d6d0;">
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
  return `You're on the KORÉ waitlist.

Every piece starts in the quiet space between imagination and creation. Thank you for being one of the first to join us as we get ready to open our doors.

We'll reach out as soon as it's time, with early access details.

Made with intention. Made by hand. Made for you by D'SEIKOU.

With gratitude,
D'SEIKOU

Because some things aren't meant to be replaced. They're meant to be inherited.`;
}

/* ---------- Routes ---------- */

// Register for the waitlist
app.post('/api/waitlist', async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase();

  // Don't accept registrations that cannot receive confirmation emails.
  if (!resend) {
    return res.status(503).json({
      error: 'The waitlist is temporarily unavailable. Please check back soon.',
    });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address.',
    });
  }

  try {
    const list = await readWaitlist();

    // Avoid registering the same address twice.
    if (list.some((entry) => entry.email === email)) {
      return res.json({
        message: "You're already on the waitlist. We'll be in touch soon.",
        alreadyJoined: true,
      });
    }

    // Send the confirmation email.
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You're on the KORÉ waitlist",
      html: confirmationHtml(),
      text: confirmationText(),
    });

    if (error) {
      throw new Error(error.message || 'Resend returned an error.');
    }

    // Save the address after Resend accepts the email request.
    list.push({
      email,
      joinedAt: new Date().toISOString(),
    });

    await writeWaitlist(list);

    return res.status(201).json({
      message: 'Check your inbox. Your confirmation is on its way.',
    });
  } catch (err) {
    console.error('Waitlist error:', err.message || err);

    return res.status(500).json({
      error: 'We could not add you right now. Please try again in a moment.',
    });
  }
});

// Get the current waitlist count
app.get('/api/waitlist/count', async (_req, res) => {
  try {
    const list = await readWaitlist();

    return res.json({
      count: list.length,
    });
  } catch (err) {
    console.error('Waitlist count error:', err.message || err);

    return res.status(500).json({
      error: 'Unable to retrieve the waitlist count.',
    });
  }
});

// Start the local Express server
app.listen(PORT, () => {
  console.log(`KORÉ by D'SEIKOU running at http://localhost:${PORT}`);
});
