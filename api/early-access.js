const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Mindify <noreply@mindify.app>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${details}`);
  }
}

async function saveLeadToGoogleSheets({ email, submittedAt }) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('GOOGLE_SHEETS_WEBHOOK_URL is not configured.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      submittedAt,
      source: 'mindify-landing',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Sheets webhook failed: ${response.status} ${details}`);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Sadece POST istekleri desteklenir.' });
  }

  try {
    const { email } = request.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return response.status(400).json({ message: 'Lütfen geçerli bir e-posta adresi girin.' });
    }

    const ownerEmail = process.env.LEADS_TO_EMAIL || process.env.MAIL_TO || 'hello@mindify.app';
    const safeEmail = escapeHtml(normalizedEmail);
    const submittedAt = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await saveLeadToGoogleSheets({
      email: normalizedEmail,
      submittedAt,
    });

    if (process.env.RESEND_API_KEY) {
      await Promise.all([
        sendEmail({
          to: ownerEmail,
          subject: `Yeni Mindify erken erişim kaydı: ${normalizedEmail}`,
          html: `
            <h2>Yeni erken erişim kaydı</h2>
            <p><strong>E-posta:</strong> ${safeEmail}</p>
            <p><strong>Tarih:</strong> ${escapeHtml(submittedAt)}</p>
          `,
        }),
        sendEmail({
          to: normalizedEmail,
          subject: 'Mindify erken erişim kaydınızı aldık',
          html: `
            <p>Merhaba,</p>
            <p>Mindify erken erişim kaydınızı aldık.</p>
            <p>Uygulama yayınlandığında hediyemizle beraber uygulamaya kayıt olabilirsiniz. Gelişmelerden sizi e-posta ile haberdar edeceğiz.</p>
            <p>Sevgiler,<br />Mindify Ekibi</p>
          `,
        }),
      ]);
    }

    return response.status(200).json({
      message: 'Kaydınızı aldık. Uygulama yayınlandığında hediyemizle beraber uygulamaya kayıt olabilirsiniz.',
    });
  } catch (error) {
    console.error('Early access signup failed:', error);

    return response.status(500).json({
      message: 'Kaydınızı şu anda alamadık. Lütfen biraz sonra tekrar deneyin.',
    });
  }
};
