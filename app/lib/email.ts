import { Resend } from "resend";
import type { ReminderCategory } from "@/app/lib/giveaway-db";

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
    body { margin: 0; padding: 0; background-color: #f7f6f3; font-family: 'Cormorant Garamond', Georgia, serif; }
    .container { max-width: 560px; margin: 0 auto; padding: 48px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 300; letter-spacing: 0.15em; color: #000; margin: 0; }
    .content { background: #ffffff; padding: 40px 32px; border-radius: 4px; }
    .content h2 { font-size: 24px; font-weight: 400; color: #000; margin: 0 0 16px 0; line-height: 1.3; }
    .content p { font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: #000; color: #fff !important; padding: 14px 32px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; }
    .link-box { background: #f7f6f3; padding: 14px 20px; font-size: 14px; color: #333; word-break: break-all; margin: 16px 0; border-radius: 4px; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #999; }
  `;
}

export async function sendGiveawayConfirmation(email: string, referralCode: string) {
  const resend = getResend();
  const referralLink = `${BASE_URL}/waitlist?ref=${referralCode}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "You're in — VIA Giveaway",
    html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles()}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>VIA</h1></div>
    <div class="content">
      <h2>You're entered in the VIA Giveaway.</h2>
      <p>Thanks for entering. To be officially entered to win a $1,000 shopping spree on VIA, share your unique link with two friends and have them enter too.</p>
      <p><strong>Your unique referral link:</strong></p>
      <div class="link-box">${referralLink}</div>
      <p>Send this link to two friends. Once both enter, you'll be officially in the running.</p>
      <a href="${referralLink}" class="btn">Share Your Link</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & resale, worldwide.</p>
    </div>
  </div>
</body>
</html>`,
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

  const heading = isComplete
    ? "You're officially entered!"
    : "1 down, 1 to go.";

  const body = isComplete
    ? `<p>Both of your friends have entered the giveaway. You're now officially in the running to win a $1,000 shopping spree on VIA!</p>
       <p>We'll be in touch when we pick a winner. In the meantime, start browsing.</p>
       <a href="${BASE_URL}" class="btn">Start Shopping</a>`
    : `<p>One of your friends just entered the giveaway using your link. One more to go and you'll be officially entered to win.</p>
       <p><strong>Your referral link:</strong></p>
       <div class="link-box">${referralLink}</div>
       <p>Send it to one more friend to complete your entry.</p>
       <a href="${referralLink}" class="btn">Share Your Link</a>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles()}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>VIA</h1></div>
    <div class="content">
      <h2>${heading}</h2>
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & resale, worldwide.</p>
    </div>
  </div>
</body>
</html>`,
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
        <p>Send it to two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "invited_no_entries":
      subject = "Your friends haven't entered yet — VIA Giveaway";
      heading = "Your friends haven't entered yet.";
      body = `
        <p>You invited friends to the VIA Giveaway, but none of them have entered yet. Send them a reminder or share your link with others to make sure you're officially in the running.</p>
        <p><strong>Your unique referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p>Share this link with two friends to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;

    case "one_referral":
      subject = "1 more friend to go — VIA Giveaway";
      heading = "You're almost there.";
      body = `
        <p>One of your friends has entered the giveaway, but you need one more to be officially entered to win a $1,000 shopping spree on VIA.</p>
        <p><strong>Your referral link:</strong></p>
        <div class="link-box">${referralLink}</div>
        <p>Send it to one more friend to complete your entry.</p>
        <a href="${referralLink}" class="btn">Share Your Link</a>`;
      break;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles()}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>VIA</h1></div>
    <div class="content">
      <h2>${heading}</h2>
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & resale, worldwide.</p>
    </div>
  </div>
</body>
</html>`,
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
         <img src="${productImage}" alt="${productTitle}" style="max-width: 100%; max-height: 300px; object-fit: cover; border-radius: 4px;" />
       </div>`
    : "";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your loved item is getting attention",
    html: `
<!DOCTYPE html>
<html>
<head><style>${baseStyles()}</style></head>
<body>
  <div class="container">
    <div class="header"><h1>VIA</h1></div>
    <div class="content">
      <h2>Your favorite piece is trending.</h2>
      ${imageBlock}
      <p><strong>${productTitle}</strong> from ${storeName}</p>
      <p>This item has been getting a lot of attention lately. If you love it, don't wait &mdash; vintage is one-of-a-kind, and once it's gone, it's gone forever.</p>
      <a href="${productUrl}" class="btn">Shop Now</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VIA. Curated vintage & resale, worldwide.</p>
    </div>
  </div>
</body>
</html>`,
  });
}
