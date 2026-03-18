import { Resend } from "resend";
import { createHash, randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
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
const FROM_EMAIL = "VYA <hana@theviaplatform.com>";

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

/**
 * Email shell matching the VYA brand design:
 * - Full cream (#F7F3EA) background, no white content box
 * - VYA logo centered at top with a spaced-caps subtitle
 * - Generous whitespace, left-aligned body text
 * - Footer with website, Instagram, and unsubscribe link
 */
function viaShell(subtitle: string, content: string, unsubscribeUrl?: string): string {
  const year = new Date().getFullYear();
  const unsubUrl = unsubscribeUrl || `${BASE_URL}/account`;
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
:root { color-scheme: light only; }
body { margin: 0; padding: 0; background-color: #F7F3EA !important; font-family: Georgia, 'Times New Roman', serif; }
@media (prefers-color-scheme: dark) {
  body { background-color: #F7F3EA !important; color: #5D0F17 !important; }
  a { color: #5D0F17 !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F7F3EA;">
<div style="background-color:#F7F3EA;padding:52px 24px 48px;">
  <div style="max-width:560px;margin:0 auto;">

    <!-- Header: logo + subtitle -->
    <div style="text-align:center;margin-bottom:56px;">
      <img src="https://vyaplatform.com/vya-logo.png" alt="VYA." width="160"
        style="display:block;margin:0 auto;width:160px;height:auto;" border="0" />
      <p style="margin:10px 0 0;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;
        color:#5D0F17;font-family:Georgia,'Times New Roman',serif;">${subtitle}</p>
    </div>

    <!-- Body -->
    ${content}

    <!-- Footer -->
    <div style="text-align:center;margin-top:72px;">
      <p style="margin:0;font-size:12px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:2;">
        <a href="${BASE_URL}" style="color:#5D0F17;text-decoration:none;">theviaplatform.com</a><br />
        IG: <a href="https://www.instagram.com/vyaplatform" style="color:#5D0F17;text-decoration:none;">@vyaplatform</a>
      </p>
      <p style="margin:18px 0 0;font-size:12px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;">
        <a href="${unsubUrl}" style="color:#5D0F17;text-decoration:underline;">Unsubscribe here</a>
      </p>
      <p style="margin:10px 0 0;font-size:10px;color:rgba(93,15,23,0.4);font-family:Georgia,'Times New Roman',serif;">
        &copy; ${year} VYA.
      </p>
    </div>

  </div>
</div>
</body>
</html>`;
}

function emailShell(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
:root { color-scheme: light only; }
${baseStyles()}
/* Force light mode — prevent Apple Mail / Outlook dark mode inversion */
@media (prefers-color-scheme: dark) {
  body, .wrapper { background-color: #F7F3EA !important; }
  .content { background-color: #ffffff !important; }
  .content h2 { color: #5D0F17 !important; }
  .content p { color: #5D0F17 !important; }
  .btn { background-color: #5D0F17 !important; color: #F7F3EA !important; }
  .footer { color: rgba(93,15,23,0.45) !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#F7F3EA;">
<div class="wrapper" style="background-color:#F7F3EA;padding:40px 16px;">
  <div class="container" style="max-width:600px;margin:0 auto;">
    <div class="header" style="text-align:center;padding:32px 0 28px;">
      <img src="${BASE_URL}/vya-logo.png" alt="VYA" width="160" style="display:block;margin:0 auto;max-height:80px;width:160px;" border="0" />
    </div>
    <div class="content" style="background:#ffffff;padding:40px 32px;">
      ${content}
    </div>
    <div class="footer" style="text-align:center;margin-top:32px;font-size:11px;color:rgba(93,15,23,0.45);padding-bottom:24px;">
      <p>&copy; ${year} VYA. Vintage &amp; secondhand, worldwide.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function formatEmailPrice(price: number | string, currency: string): string {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}`;
}

function productViaUrl(p: DBProduct): string {
  // Link directly to the VYA product page — /api/track overrides the url param
  // and redirects to the external store, so we bypass it for email links.
  return `${BASE_URL}/products/${p.store_slug}-${p.id}`;
}

export async function sendGiveawayConfirmation(email: string, referralCode: string) {
  const resend = getResend();
  const referralLink = `${BASE_URL}/waitlist?ref=${referralCode}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're almost there — VYA Giveaway",
    html: emailShell(`
      <h2>You're almost there.</h2>
      <p>Thanks for signing up! You're just a few steps away from being officially entered to win a $1,000 shopping spree on VYA. Share your unique link with two friends and have them enter too.</p>
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
    ? "You're officially entered — VYA Giveaway"
    : "1 of 2 friends entered — VYA Giveaway";

  const heading = isComplete ? "You're officially entered!" : "1 down, 1 to go.";

  const body = isComplete
    ? `<p>Both of your friends have entered the giveaway. You're now officially in the running to win a $1,000 shopping spree on VYA!</p>
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
      subject = "Don't forget — share to enter the VYA Giveaway";
      heading = "You haven't shared your link yet.";
      body = `
        <p>You signed up for the VYA Giveaway, but you haven't shared your referral link yet. To be officially entered to win a $1,000 shopping spree, share your link with two friends and have them enter.</p>
        <p><strong>Your unique referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p class="muted">Send it to two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "invited_no_entries":
      subject = "Your friends haven't entered yet — VYA Giveaway";
      heading = "Your friends haven't entered yet.";
      body = `
        <p>You invited friends to the VYA Giveaway, but none of them have entered yet. Send them a reminder or share your link with others to make sure you're officially in the running.</p>
        <p><strong>Your unique referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p class="muted">Share this link with two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "one_referral":
      subject = "1 more friend to go — VYA Giveaway";
      heading = "You're almost there.";
      body = `
        <p>One of your friends has entered the giveaway, but you need one more to be officially entered to win a $1,000 shopping spree on VYA.</p>
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
    subject: "Welcome to VYA Insider",
    html: emailShell(`
      <h2>You're in.</h2>
      <p>Welcome to VYA Insider. You now have 24-hour early access to new arrivals from all of our stores — before anyone else sees them.</p>
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
  price?: number,
  currency?: string,
  clickCount?: number,
) {
  const resend = getResend();

  const imgBlock = productImage
    ? `<a href="${productUrl}" style="text-decoration:none;display:block;margin:32px 0 24px;">
         <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="480"
           style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" border="0" />
       </a>`
    : `<div style="height:28px;"></div>`;

  const socialProof = clickCount && clickCount >= 5
    ? `<p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(93,15,23,0.55);
         font-family:Georgia,'Times New Roman',serif;margin:0 0 14px;">${clickCount} people have viewed this recently</p>`
    : "";

  const priceBlock = price && currency
    ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 28px;">
         ${formatEmailPrice(price, currency)}
       </p>`
    : `<div style="height:28px;"></div>`;

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      Something you saved is <strong>getting attention.</strong>
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
      Others are looking at it right now &mdash; and vintage is always one of a kind.
      If you love it, don't wait.
    </p>

    ${imgBlock}

    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
       font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${storeName}</p>
    <a href="${productUrl}" style="text-decoration:none;">
      <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
         line-height:1.35;margin:0 0 8px;">${productTitle}</p>
    </a>
    ${socialProof}
    ${priceBlock}
    <p style="font-size:14px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;
       line-height:1.75;margin:0 0 32px;">
      Once it&rsquo;s gone, it&rsquo;s gone forever.
    </p>
    <a href="${productUrl}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
              text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
              font-family:Georgia,'Times New Roman',serif;">Shop Now</a>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Someone else is looking at your saved piece`,
    html: viaShell("For You", content),
  });
}

/**
 * Send a new arrivals email to all VYA Insider members.
 * Shows all provided products in a 2-column grid with images, titles, and prices.
 */
export async function sendInsiderNewArrivalsEmail(
  emails: string[],
  products: DBProduct[]
): Promise<{ sent: number; failed: number }> {
  if (emails.length === 0 || products.length === 0) return { sent: 0, failed: 0 };

  const resend = getResend();

  function productCell(p: DBProduct): string {
    const url = productViaUrl(p);
    const imgBlock = p.image
      ? `<a href="${url}" style="text-decoration:none;display:block;">
           <img src="${p.image}" alt="${p.title.replace(/"/g, "&quot;")}" width="240"
             style="display:block;width:100%;height:220px;object-fit:cover;" border="0" />
         </a>`
      : `<div style="width:100%;height:220px;background:rgba(93,15,23,0.06);"></div>`;

    const priceStr = formatEmailPrice(p.price, p.currency);
    const compareStr = p.compare_at_price ? formatEmailPrice(p.compare_at_price, p.currency) : null;
    const priceBlock = compareStr
      ? `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>
         <span style="color:rgba(93,15,23,0.4);font-size:12px;text-decoration:line-through;margin-left:6px;
           font-family:Georgia,'Times New Roman',serif;">${compareStr}</span>`
      : `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>`;

    return `
      ${imgBlock}
      <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
         margin:10px 0 3px;font-family:Georgia,'Times New Roman',serif;">${p.store_name}</p>
      <a href="${url}" style="text-decoration:none;">
        <p style="font-size:13px;color:#5D0F17;margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;
           line-height:1.35;">${p.title}</p>
      </a>
      <p style="margin:0 0 14px;">${priceBlock}</p>
      <a href="${url}"
         style="display:inline-block;border:1px solid #5D0F17;color:#5D0F17;padding:8px 18px;
                text-decoration:none;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;
                font-family:Georgia,'Times New Roman',serif;">View Item</a>
    `;
  }

  // Build 2-column product grid (table-based for email client compatibility)
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const left = products[i];
    const right = products[i + 1] || null;
    rows.push(`
      <tr>
        <td width="50%" valign="top" style="padding:0 14px 40px 0;">
          ${productCell(left)}
        </td>
        <td width="50%" valign="top" style="padding:0 0 40px 0;">
          ${right ? productCell(right) : ""}
        </td>
      </tr>
    `);
  }

  const insiderUrl = `${BASE_URL}/account/insider`;

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      Your early access window is open.
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;
       line-height:1.75;margin:0 0 40px;">
      These pieces just landed &mdash; as a <strong>VYA Insider</strong>, you&rsquo;re seeing them
      24 hours before anyone else. Vintage is one-of-a-kind. Once it&rsquo;s gone, it&rsquo;s gone.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${rows.join("")}
    </table>
    <div style="text-align:center;margin-top:8px;padding-top:28px;border-top:1px solid rgba(93,15,23,0.12);">
      <a href="${insiderUrl}"
         style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
                text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                font-family:Georgia,'Times New Roman',serif;">Shop VYA Insider</a>
    </div>
  `;

  const html = viaShell("VYA Insider", content);

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "VYA Insider — New Arrivals Just Dropped",
        html,
      });
      sent++;
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

export type SourcingEmailDetails = {
  userEmail: string;
  userName: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  imageUrl: string | null;
};

/** Confirmation email sent to the user after payment */
export async function sendSourcingConfirmationToUser(details: SourcingEmailDetails) {
  const resend = getResend();

  const imageBlock = details.imageUrl
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${details.imageUrl}" alt="Your sourcing request" style="max-width: 100%; max-height: 320px; object-fit: contain;" />
       </div>`
    : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.userEmail,
    subject: "Your sourcing request has been received — VYA",
    html: emailShell(`
      <h2>We're on it.</h2>
      <p>Your sourcing request has been received and your $20 fee has been processed. We'll reach out within 21 business days if we find a match.</p>
      ${imageBlock}
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Description</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.description}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Budget</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">$${details.priceMin} – $${details.priceMax}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Condition</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.condition}</td></tr>
        ${details.size ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Size</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.size}</td></tr>` : ""}
        <tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Deadline</td><td style="padding:8px 0;font-size:14px;color:#5D0F17;">${details.deadline}</td></tr>
      </table>
      <p class="muted" style="font-size:13px;">If we can't find a match within 21 business days, your $20 fee will be fully refunded.</p>
    `),
  });
}

/** Notification sent to hana@ and all store emails */
export async function sendSourcingRequestToStores(
  storeEmails: string[],
  details: SourcingEmailDetails
): Promise<void> {
  const resend = getResend();
  const VIA_EMAIL = "hana@theviaplatform.com";

  const imageBlock = details.imageUrl
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${details.imageUrl}" alt="Sourcing request item" style="max-width: 100%; max-height: 320px; object-fit: contain;" />
       </div>`
    : "";

  const html = emailShell(`
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);margin:0 0 8px;">Sourcing Request from VYA</p>
    <h2 style="margin-bottom:20px;">New Sourcing Request</h2>
    ${imageBlock}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);width:120px;">Customer</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.userName || "—"} &lt;${details.userEmail}&gt;</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Description</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.description}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Budget</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">$${details.priceMin} – $${details.priceMax}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Condition</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.condition}</td></tr>
      ${details.size ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Size</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.size}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Deadline</td><td style="padding:8px 0;font-size:14px;color:#5D0F17;">${details.deadline}</td></tr>
    </table>
    <p class="muted" style="font-size:13px;">If you have an item that matches this request, reply directly to the customer at <a href="mailto:${details.userEmail}" style="color:#5D0F17;">${details.userEmail}</a>.</p>
  `);

  const isDev = process.env.NODE_ENV === "development";
  const allRecipients = isDev ? [VIA_EMAIL] : [VIA_EMAIL, ...storeEmails];

  for (const email of allRecipients) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "Sourcing Request from VYA",
        html,
      });
    } catch (err) {
      console.error(`Failed to send sourcing request email to ${email}:`, err);
    }
  }
}

/** Sent to the customer when a store submits a sourcing offer */
export async function sendSourcingOfferToCustomer(details: {
  customerEmail: string;
  customerName: string | null;
  storeName: string;
  fee: number;
  timeline: string;
  notes: string | null;
  requestDescription: string;
  requestId: string;
}) {
  const resend = getResend();
  const requestUrl = `${BASE_URL}/account/sourcing/${details.requestId}`;
  const notesRow = details.notes
    ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Notes</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.notes}</td></tr>`
    : "";

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      A store has reviewed your sourcing request and submitted an offer.
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 32px;">
      You can accept this offer — or wait to see if other stores respond. Once you accept, the store will reach out directly.
    </p>
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);font-family:Georgia,'Times New Roman',serif;margin:0 0 4px;">Your Request</p>
    <p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 24px;line-height:1.5;">${details.requestDescription}</p>
    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);font-family:Georgia,'Times New Roman',serif;margin:0 0 8px;">Offer from ${details.storeName}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 32px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);width:120px;">Sourcing Fee</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;"><strong>$${details.fee}</strong></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Timeline</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.timeline}</td></tr>
      ${notesRow}
    </table>
    <a href="${requestUrl}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
              text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
              font-family:Georgia,'Times New Roman',serif;">View &amp; Accept Offer</a>
    <p style="font-size:12px;color:rgba(93,15,23,0.5);font-family:Georgia,'Times New Roman',serif;margin:20px 0 0;line-height:1.7;">
      This is an additional fee charged by the store on top of the item price, for sourcing and finding the piece for you.
      You are under no obligation to accept — your $20 VYA sourcing fee is separate and unaffected.
    </p>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.customerEmail,
    subject: `${details.storeName} submitted a sourcing offer — VYA`,
    html: viaShell("Sourcing Offer", content),
  });
}

/** Sent to the store when the customer accepts their offer */
export async function sendSourcingOfferAcceptedToStore(details: {
  storeEmail: string;
  storeName: string;
  customerName: string | null;
  customerEmail: string;
  requestDescription: string;
  fee: number;
  timeline: string;
}) {
  const resend = getResend();

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      A customer has accepted your sourcing offer.
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 32px;">
      Please reach out to them directly to arrange the next steps.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 32px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);width:130px;">Customer</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.customerName || "—"}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Email</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;"><a href="mailto:${details.customerEmail}" style="color:#5D0F17;">${details.customerEmail}</a></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Request</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.requestDescription}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Your Fee</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">$${details.fee}</td></tr>
      <tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Timeline</td><td style="padding:8px 0;font-size:14px;color:#5D0F17;">${details.timeline}</td></tr>
    </table>
    <a href="mailto:${details.customerEmail}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
              text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
              font-family:Georgia,'Times New Roman',serif;">Email Customer</a>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.storeEmail,
    subject: `Your sourcing offer was accepted — VYA`,
    html: viaShell("Offer Accepted", content),
  });
}

export async function sendCollabsLinksStuckAlert(stuckProducts: DBProduct[]): Promise<void> {
  const resend = getResend();

  // Group by store
  const byStore = new Map<string, number>();
  for (const p of stuckProducts) {
    byStore.set(p.store_slug, (byStore.get(p.store_slug) ?? 0) + 1);
  }

  const storeRows = Array.from(byStore.entries())
    .map(
      ([slug, count]) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${slug}</td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${count} product${count !== 1 ? "s" : ""}</td>
      </tr>`
    )
    .join("");

  const sampleTitles = stuckProducts
    .slice(0, 5)
    .map(
      (p) =>
        `<li style="font-size:13px;color:#5D0F17;margin-bottom:4px;">${p.title} <span style="opacity:0.5;">(${p.store_slug})</span></li>`
    )
    .join("");

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 16px;">
      ${stuckProducts.length} product${stuckProducts.length !== 1 ? "s" : ""} have been missing Collabs links
      for more than 3 days and are hidden from VYA.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
      <tr>
        <th style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.2);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(93,15,23,0.5);text-align:left;">Store</th>
        <th style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.2);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(93,15,23,0.5);text-align:left;">Count</th>
      </tr>
      ${storeRows}
    </table>
    <p style="font-size:13px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 8px;"><strong>Examples:</strong></p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      ${sampleTitles}
    </ul>
    <p style="font-size:13px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;margin:0 0 24px;">
      These products have a Shopify ID but were not found in the Collabs catalog after 3+ days of retries.
      They may not be enrolled in the Collabs program for their store, or the Collabs credentials may need refreshing.
    </p>
    <a href="${BASE_URL}/admin/analytics"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:12px 24px;font-size:13px;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">
      Check Admin →
    </a>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: "hana@theviaplatform.com",
    subject: `${stuckProducts.length} product${stuckProducts.length !== 1 ? "s" : ""} missing Collabs links — action needed`,
    html: viaShell("Collabs Coverage Alert", content),
  });
}

async function createMagicSignInLink(email: string): Promise<string> {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return `${BASE_URL}/login`;

    const rawToken = randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Auth.js v5 hashes the token as SHA-256(rawToken + secret) before storing
    const hashedToken = createHash("sha256").update(`${rawToken}${secret}`).digest("hex");

    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) return `${BASE_URL}/login`;

    const sql = neon(databaseUrl);
    // Clean up any existing tokens for this email, then insert
    await sql`DELETE FROM verification_tokens WHERE identifier = ${email}`;
    await sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${email}, ${hashedToken}, ${expires.toISOString()})
    `;

    // callbackUrl goes through pilot-check so the via_access cookie gets set
    // Use a relative path so Auth.js doesn't reject it as cross-origin
    const callbackUrl = `/api/pilot-check?next=/`;
    const params = new URLSearchParams({ callbackUrl, token: rawToken, email });
    return `${BASE_URL}/api/auth/callback/resend?${params}`;
  } catch {
    return `${BASE_URL}/login`;
  }
}

export async function sendPilotApprovalEmail(
  email: string,
  firstName?: string
): Promise<void> {
  const resend = getResend();
  const magicLink = await createMagicSignInLink(email);
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const content = `
    <p style="font-size:15px;color:#5D0F17;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:15px;color:#5D0F17;margin:0 0 16px;">
      You have exclusive access to shop the VYA pilot &mdash; our curated edit of independent vintage and secondhand stores, all in one place.
    </p>
    <a href="${magicLink}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:14px 32px;font-size:12px;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-family:Georgia,serif;">
      Start Shopping
    </a>
    <p style="font-size:13px;color:rgba(93,15,23,0.5);margin-top:24px;">
      This link expires in 7 days. After that, sign in at vyaplatform.com with this email address.
    </p>
  `;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're approved — welcome to VYA",
    html: viaShell("You're in.", content),
  });
}

export async function sendWaitlistConfirmationEmail(
  email: string,
  firstName?: string
): Promise<void> {
  const resend = getResend();
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 16px;">${greeting}</p>
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 16px;">
      We&rsquo;ve added you to the waitlist. We&rsquo;ll let you know when you&rsquo;re in.
    </p>
    <p style="font-size:13px;color:rgba(93,15,23,0.5);font-family:Georgia,'Times New Roman',serif;margin:0;">
      In the meantime, follow us on Instagram <a href="https://www.instagram.com/vyaplatform" style="color:#5D0F17;">@vyaplatform</a> to stay in the loop.
    </p>
  `;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're on the waitlist — VYA",
    html: viaShell("You're on the list.", content),
  });
}

export async function sendCollabsCredentialsExpiredAlert(): Promise<void> {
  const resend = getResend();
  const content = `
    <p style="font-size:15px;color:#5D0F17;margin:0 0 16px;">Your Shopify Collabs session has expired.</p>
    <p style="font-size:14px;color:#5D0F17;margin:0 0 24px;">
      The cron job that generates affiliate links for new products is currently failing with a 401 error.
      New products added to Shopify won't appear on VYA until you refresh your credentials.
    </p>
    <a href="${BASE_URL}/admin/analytics"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:12px 24px;font-size:13px;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;">
      Update Credentials →
    </a>
  `;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: "hana@theviaplatform.com",
    subject: "Action needed — Shopify Collabs credentials expired",
    html: viaShell("Collabs Credentials Expired", content),
  });
}

export async function sendAbandonedCartEmail(
  email: string,
  productTitle: string,
  productImage: string | null,
  storeName: string,
  productUrl: string,
  price?: number,
  currency?: string,
): Promise<void> {
  const resend = getResend();

  const imgBlock = productImage
    ? `<a href="${productUrl}" style="text-decoration:none;display:block;margin:32px 0 24px;">
         <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="480"
           style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" border="0" />
       </a>`
    : `<div style="height:28px;"></div>`;

  const priceBlock = price && currency
    ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 28px;">
         ${formatEmailPrice(price, currency)}
       </p>`
    : `<div style="height:16px;"></div>`;

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      Looks like you left something behind.
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
      Your cart is waiting &mdash; but vintage is one of a kind. Get it now before someone else does.
    </p>

    ${imgBlock}

    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
       font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${storeName}</p>
    <a href="${productUrl}" style="text-decoration:none;">
      <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
         line-height:1.35;margin:0 0 8px;">${productTitle}</p>
    </a>
    ${priceBlock}
    <a href="${productUrl}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
              text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
              font-family:Georgia,'Times New Roman',serif;">Complete Your Purchase</a>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You left something behind",
    html: viaShell("Your Cart", content),
  });
}

export async function sendTrendingItemEmail(
  email: string,
  productTitle: string,
  productImage: string | null,
  storeName: string,
  productUrl: string,
  favoriteCount: number,
  price?: number,
  currency?: string,
): Promise<void> {
  const resend = getResend();

  const imgBlock = productImage
    ? `<a href="${productUrl}" style="text-decoration:none;display:block;margin:32px 0 24px;">
         <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="480"
           style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" border="0" />
       </a>`
    : `<div style="height:28px;"></div>`;

  const priceBlock = price && currency
    ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 28px;">
         ${formatEmailPrice(price, currency)}
       </p>`
    : `<div style="height:16px;"></div>`;

  const content = `
    <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
      Something you saved is <strong>trending.</strong>
    </p>
    <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
      ${favoriteCount} people have saved this piece &mdash; and there&rsquo;s only one.
      If you love it, don&rsquo;t wait.
    </p>

    ${imgBlock}

    <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
       font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${storeName}</p>
    <a href="${productUrl}" style="text-decoration:none;">
      <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
         line-height:1.35;margin:0 0 8px;">${productTitle}</p>
    </a>
    ${priceBlock}
    <p style="font-size:14px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;
       line-height:1.75;margin:0 0 32px;">
      Once it&rsquo;s gone, it&rsquo;s gone forever.
    </p>
    <a href="${productUrl}"
       style="display:inline-block;background:#5D0F17;color:#F7F3EA;padding:13px 36px;
              text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
              font-family:Georgia,'Times New Roman',serif;">Shop Now</a>
  `;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your saved item is trending",
    html: viaShell("Trending", content),
  });
}
