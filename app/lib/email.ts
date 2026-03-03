import { Resend } from "resend";
import type { ReminderCategory } from "@/app/lib/giveaway-db";
import type { DBProduct } from "@/app/lib/db";

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set.");
  }
  return new Resend(apiKey);
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";
const FROM_EMAIL = "VIA <hana@theviaplatform.com>";

function baseStyles() {
  return `
    body { margin: 0; padding: 0; background-color: #F7F3EA; font-family: Georgia, 'Times New Roman', serif; }
    .wrapper { background-color: #F7F3EA; padding: 40px 16px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 32px 0 28px; }
    .content { background: #ffffff; padding: 40px 32px; }
    .content h2 { font-size: 24px; font-weight: 400; color: #5D0F17; margin: 0 0 16px 0; line-height: 1.3; font-family: Georgia, serif; }
    .content p { font-size: 15px; color: #5D0F17; line-height: 1.6; margin: 0 0 16px 0; }
    .content p.muted { opacity: 0.65; }
    .btn { display: inline-block; background: #5D0F17; color: #F7F3EA !important; padding: 14px 32px; text-decoration: none; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 8px; font-family: Georgia, serif; }
    .link-box { background: #F7F3EA; padding: 14px 20px; font-size: 13px; color: #5D0F17; word-break: break-all; margin: 16px 0; border: 1px solid rgba(93,15,23,0.15); }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: rgba(93,15,23,0.45); padding-bottom: 24px; }
  `;
}

function emailShell(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${baseStyles()}</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <img src="${BASE_URL}/via-logo.png" alt="VIA" width="120" style="display: block; margin: 0 auto; max-height: 80px; width: auto;" border="0" />
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${year} VIA. Vintage &amp; secondhand, worldwide.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function formatEmailPrice(price: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}

function productTrackUrl(p: DBProduct): string {
  const compositeId = `${p.store_slug}-${p.id}`;
  const dest = p.external_url || `${BASE_URL}/stores/${p.store_slug}`;
  return `${BASE_URL}/api/track?pid=${encodeURIComponent(compositeId)}&pn=${encodeURIComponent(p.title)}&s=${encodeURIComponent(p.store_name)}&ss=${encodeURIComponent(p.store_slug)}&url=${encodeURIComponent(dest)}`;
}

export async function sendGiveawayConfirmation(email: string, referralCode: string) {
  const resend = getResend();
  const referralLink = `${BASE_URL}/waitlist?ref=${referralCode}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're almost there — VIA Giveaway",
    html: emailShell(`
      <h2>You're almost there.</h2>
      <p>Thanks for signing up! You're just a few steps away from being officially entered to win a $1,000 shopping spree on VIA. Share your unique link with two friends and have them enter too.</p>
      <p><strong>Your unique referral link:</strong></p>
      <div class="link-box">${referralLink}</div>
      <p class="muted">Send this link to two friends. Once both enter, you'll be officially in the running.</p>
      <a href="${referralLink}" class="btn">Share Your Link</a>
    `),
  });
}

export async function sendFriendEnteredEmail(
  email: string,
  referralCode: string,
  friendNumber: 1 | 2
) {
  const resend = getResend();
  const referralLink = `${BASE_URL}/waitlist?ref=${referralCode}`;
  const isComplete = friendNumber === 2;

  const subject = isComplete
    ? "You're officially entered — VIA Giveaway"
    : "1 of 2 friends entered — VIA Giveaway";

  const heading = isComplete ? "You're officially entered!" : "1 down, 1 to go.";

  const body = isComplete
    ? `<p>Both of your friends have entered the giveaway. You're now officially in the running to win a $1,000 shopping spree on VIA!</p>
       <p class="muted">We'll be in touch when we pick a winner. In the meantime, start browsing.</p>
       <a href="${BASE_URL}" class="btn">Start Shopping</a>`
    : `<p>One of your friends just entered the giveaway using your link. One more to go and you'll be officially entered to win.</p>
       <p><strong>Your referral link:</strong></p>
       <div class="link-box">${referralLink}</div>
       <p class="muted">Send it to one more friend to complete your entry.</p>
       <a href="${referralLink}" class="btn">Share Your Link</a>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: emailShell(`<h2>${heading}</h2>${body}`),
  });
}

export async function sendGiveawayReminder(
  email: string,
  referralCode: string,
  category: ReminderCategory
) {
  const resend = getResend();
  const referralLink = `${BASE_URL}/waitlist?ref=${referralCode}`;

  let subject: string;
  let heading: string;
  let body: string;

  switch (category) {
    case "no_activity":
      subject = "Don't forget — share to enter the VIA Giveaway";
      heading = "You haven't shared your link yet.";
      body = `
        <p>You signed up for the VIA Giveaway, but you haven't shared your referral link yet. To be officially entered to win a $1,000 shopping spree, share your link with two friends and have them enter.</p>
        <p><strong>Your unique referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p class="muted">Send it to two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "invited_no_entries":
      subject = "Your friends haven't entered yet — VIA Giveaway";
      heading = "Your friends haven't entered yet.";
      body = `
        <p>You invited friends to the VIA Giveaway, but none of them have entered yet. Send them a reminder or share your link with others to make sure you're officially in the running.</p>
        <p><strong>Your unique referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p class="muted">Share this link with two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "one_referral":
      subject = "1 more friend to go — VIA Giveaway";
      heading = "You're almost there.";
      body = `
        <p>One of your friends has entered the giveaway, but you need one more to be officially entered to win a $1,000 shopping spree on VIA.</p>
        <p><strong>Your referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p class="muted">Send it to one more friend to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: emailShell(`<h2>${heading}</h2>${body}`),
  });
}

export async function sendMembershipConfirmation(email: string) {
  const resend = getResend();
  const insiderUrl = `${BASE_URL}/account/insider`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Welcome to VIA Insider",
    html: emailShell(`
      <h2>You're in.</h2>
      <p>Welcome to VIA Insider. You now have 24-hour early access to new arrivals from all of our stores — before anyone else sees them.</p>
      <p class="muted">Head to your Insider page to see what's just dropped.</p>
      <a href="${insiderUrl}" class="btn">View New Arrivals</a>
      <p style="font-size: 12px; color: rgba(93,15,23,0.45); margin-top: 24px;">You'll be billed $10/month. You can cancel anytime from your account page.</p>
    `),
  });
}

export async function sendFavoriteActivityNotification(
  email: string,
  productTitle: string,
  productImage: string | null,
  storeName: string,
  productUrl: string,
) {
  const resend = getResend();

  const imageBlock = productImage
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${productImage}" alt="${productTitle}" style="max-width: 100%; max-height: 300px; object-fit: cover;" />
       </div>`
    : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your loved item is getting attention",
    html: emailShell(`
      <h2>Your favorite piece is trending.</h2>
      ${imageBlock}
      <p><strong>${productTitle}</strong> from ${storeName}</p>
      <p class="muted">This item has been getting a lot of attention lately. If you love it, don't wait &mdash; vintage is one-of-a-kind, and once it's gone, it's gone forever.</p>
      <a href="${productUrl}" class="btn">Shop Now</a>
    `),
  });
}

/**
 * Send a new arrivals email to all VIA Insider members.
 * Shows all provided products in a 2-column grid with images, titles, and prices.
 */
export async function sendInsiderNewArrivalsEmail(
  emails: string[],
  products: DBProduct[]
): Promise<{ sent: number; failed: number }> {
  if (emails.length === 0 || products.length === 0) return { sent: 0, failed: 0 };

  const resend = getResend();

  // Build 2-column product grid (table-based for email client compatibility)
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const left = products[i];
    const right = products[i + 1] || null;

    function productCell(p: DBProduct): string {
      const url = productTrackUrl(p);
      const imgTag = p.image
        ? `<a href="${url}" style="text-decoration: none; display: block;">
             <img src="${p.image}" alt="${p.title.replace(/"/g, "&quot;")}" width="260" style="display: block; width: 100%; max-width: 260px; height: auto;" border="0" />
           </a>`
        : `<div style="width: 100%; max-width: 260px; height: 220px; background: #F7F3EA; display: block;"></div>`;

      return `
        ${imgTag}
        <p style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(93,15,23,0.5); margin: 10px 0 3px; font-family: Georgia, serif;">${p.store_name}</p>
        <p style="font-size: 14px; color: #5D0F17; margin: 0 0 4px; font-family: Georgia, serif; line-height: 1.3;">${p.title}</p>
        <p style="font-size: 13px; color: #5D0F17; margin: 0 0 12px; font-family: Georgia, serif;">${formatEmailPrice(p.price, p.currency)}</p>
        <a href="${url}" style="display: inline-block; background: #5D0F17; color: #F7F3EA; padding: 9px 20px; text-decoration: none; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-family: Georgia, serif;">Shop Now</a>
      `;
    }

    rows.push(`
      <tr>
        <td width="50%" valign="top" style="padding: 0 12px 32px 0;">
          ${productCell(left)}
        </td>
        <td width="50%" valign="top" style="padding: 0 0 32px 12px;">
          ${right ? productCell(right) : ""}
        </td>
      </tr>
    `);
  }

  const insiderUrl = `${BASE_URL}/account/insider`;

  const html = emailShell(`
    <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(93,15,23,0.5); margin: 0 0 8px; font-family: Georgia, serif;">VIA Insider</p>
    <h2 style="margin-bottom: 6px;">New Arrivals Just Dropped.</h2>
    <p class="muted" style="margin-bottom: 32px;">Get them before anyone else.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
      ${rows.join("")}
    </table>
    <div style="text-align: center; margin-top: 8px; padding-top: 24px; border-top: 1px solid rgba(93,15,23,0.1);">
      <a href="${insiderUrl}" class="btn">View All New Arrivals</a>
    </div>
  `);

  let sent = 0;
  let failed = 0;

  // Send in batches to avoid rate limits
  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "VIA Insider — New Arrivals Just Dropped",
        html,
      });
      sent++;
      // Small delay between sends
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
