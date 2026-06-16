import { Resend } from "resend";
import { randomUUID } from "crypto";
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

const _rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "vyaplatform.com";
const BASE_URL = _rawBaseUrl.startsWith("http") ? _rawBaseUrl : `https://${_rawBaseUrl}`;
const FROM_EMAIL = "VYA <hana@vyaplatform.com>";

function baseStyles() {
 return `
 body { margin: 0; padding: 0; background-color: #FFFDF8; font-family: Georgia, 'Times New Roman', serif; }
 .wrapper { background-color: #FFFDF8; padding: 40px 16px; }
 .container { max-width: 600px; margin: 0 auto; }
 .header { text-align: center; padding: 32px 0 28px; }
 .content { background: #ffffff; padding: 40px 32px; }
 .content h2 { font-size: 24px; font-weight: 400; color: #5D0F17; margin: 0 0 16px 0; line-height: 1.3; font-family: Georgia, serif; }
 .content p { font-size: 15px; color: #5D0F17; line-height: 1.6; margin: 0 0 16px 0; }
 .content p.muted { opacity: 0.65; }
 .btn { display: inline-block; background: #5D0F17; color: #FFFDF8 !important; padding: 14px 32px; text-decoration: none; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 8px; font-family: Georgia, serif; }
 .link-box { background: #FFFDF8; padding: 14px 20px; font-size: 13px; color: #5D0F17; word-break: break-all; margin: 16px 0; border: 1px solid rgba(93,15,23,0.15); }
 .footer { text-align: center; margin-top: 32px; font-size: 11px; color: rgba(93,15,23,0.45); padding-bottom: 24px; }
 `;
}

/**
 * Email shell matching the VYA brand design:
 * - Full cream (#FFFDF8) background, no white content box
 * - VYA logo centered at top with a spaced-caps subtitle
 * - Generous whitespace, left-aligned body text
 * - Footer with website, Instagram, and unsubscribe link
 */
function minifyHtml(html: string): string {
 return html.replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ").trim();
}

function viaShell(_subtitle: string, content: string, unsubscribeUrl?: string): string {
 const year = new Date().getFullYear();
 const unsubUrl = unsubscribeUrl || `${BASE_URL}/account`;
 const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
:root { color-scheme: light only; }
body { margin: 0; padding: 0; background-color: #FFFDF8 !important; font-family: Georgia, 'Times New Roman', serif; }
/* Gmail dark mode override */
u + .body { background-color: #FFFDF8 !important; }
u + .body .email-wrapper { background-color: #FFFDF8 !important; }
u + .body .email-inner { background-color: #FFFDF8 !important; }
/* Outlook dark mode override */
[data-ogsc] body { background-color: #FFFDF8 !important; }
[data-ogsc] .email-wrapper { background-color: #FFFDF8 !important; }
[data-ogsc] .email-inner { background-color: #FFFDF8 !important; }
[data-ogsc] p, [data-ogsc] span, [data-ogsc] a, [data-ogsc] h1, [data-ogsc] h2 { color: #5D0F17 !important; }
[data-ogsc] a[style*="background:#5D0F17"] { color: #FFFDF8 !important; }
@media (prefers-color-scheme: dark) {
 body, .email-wrapper, .email-inner { background-color: #FFFDF8 !important; }
 p, span, h1, h2 { color: #5D0F17 !important; }
 a { color: #5D0F17 !important; }
 a[style*="background:#5D0F17"] { color: #FFFDF8 !important; }
}
</style>
</head>
<body class="body" style="margin:0;padding:0;background-color:#FFFDF8;" bgcolor="#FFFDF8">
<div class="email-wrapper" style="background-color:#FFFDF8;padding:52px 24px 48px;" bgcolor="#FFFDF8">
 <div class="email-inner" style="max-width:560px;margin:0 auto;background-color:#FFFDF8;" bgcolor="#FFFDF8">

 <!-- Header: logo -->
 <div style="text-align:center;margin-bottom:56px;">
 <img src="https://vyaplatform.com/vya-logo.png" alt="VYA." width="160"
 style="display:block;margin:0 auto;width:160px;height:auto;" border="0" />
 </div>

 <!-- Body -->
 ${content}

 <!-- Footer -->
 <div style="text-align:center;margin-top:72px;">
 <p style="margin:0;font-size:12px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:2;">
 <a href="${BASE_URL}" style="color:#5D0F17;text-decoration:none;">vyaplatform.com</a><br />
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
 return minifyHtml(html);
}

/**
 * Insider Newsletter shell — cream background (#FFFDF8) with brand burgundy
 * text (#5D0F17). Uses VYA brand fonts: Playfair Display (headlines) +
 * Cormorant Garamond (body) via Google Fonts, with Georgia fallback.
 */
function insiderShell(content: string, unsubscribeUrl?: string): string {
 const year = new Date().getFullYear();
 const unsubUrl = unsubscribeUrl || `${BASE_URL}/account`;
 const BG = "#FFFDF8";
 const TEXT = "#5D0F17";
 const BODY_FONT = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
 // Note: table-based layout with bgcolor attrs on every cell is required —
 // Gmail strips CSS backgrounds, only honors bgcolor reliably.
 const html = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>via VYA</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />
<style>
:root { color-scheme: light only; }
body, table, td { background-color: ${BG} !important; }
.body { background-color: ${BG} !important; }
[data-ogsc] body, [data-ogsc] .body, [data-ogsc] table, [data-ogsc] td { background-color: ${BG} !important; }
[data-ogsc] p, [data-ogsc] span, [data-ogsc] a, [data-ogsc] h1, [data-ogsc] h2, [data-ogsc] h3, [data-ogsc] li { color: ${TEXT} !important; }
@media (prefers-color-scheme: dark) {
 body, .body, table, td { background-color: ${BG} !important; }
 p, span, h1, h2, h3, li { color: ${TEXT} !important; }
 a { color: ${TEXT} !important; }
}
</style>
</head>
<body class="body" bgcolor="${BG}" style="margin:0;padding:0;background-color:${BG};font-family:${BODY_FONT};">

<!-- 100% width outer table — forces cream all the way to the email-client edges -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${BG}" style="background-color:${BG};">
 <tr>
 <td bgcolor="${BG}" align="center" style="background-color:${BG};padding:48px 16px;">

 <!-- Constrained inner table — actual content column -->
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" bgcolor="${BG}" style="background-color:${BG};max-width:560px;width:100%;">

 <!-- Header — cream to match body -->
 <tr>
 <td bgcolor="${BG}" align="center" style="background-color:${BG} !important;padding:40px 24px 32px;">
  <img src="https://vyaplatform.com/vya-logo.png" alt="VYA" width="160"
  style="display:block;margin:0 auto;width:160px;height:auto;border:0;" border="0" />
  <p style="margin:16px 0 0;font-family:${BODY_FONT};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${TEXT};font-weight:500;">
  via VYA, the vintage fashion guide for VYA insiders
  </p>
 </td>
 </tr>

 <!-- Body -->
 <tr>
 <td bgcolor="${BG}" style="background-color:${BG};padding:0;">
  ${content}
 </td>
 </tr>

 <!-- Footer -->
 <tr>
 <td bgcolor="${BG}" align="center" style="background-color:${BG};padding:56px 24px 0;">
  <p style="margin:0 0 32px;font-family:${BODY_FONT};font-size:14px;color:${TEXT};line-height:1.6;font-style:italic;">
  Have any stores you want to see on VYA? Reply to this email and let us know.
  </p>
  <p style="margin:0;font-family:${BODY_FONT};font-size:13px;color:${TEXT};line-height:2;">
  <a href="${BASE_URL}" style="color:${TEXT};text-decoration:none;">vyaplatform.com</a><br />
  IG: <a href="https://www.instagram.com/vyaplatform" style="color:${TEXT};text-decoration:none;">@vyaplatform</a>
  </p>
  <p style="margin:18px 0 0;font-family:${BODY_FONT};font-size:13px;color:${TEXT};">
  <a href="${unsubUrl}" style="color:${TEXT};text-decoration:underline;">Unsubscribe here</a>
  </p>
  <p style="margin:10px 0 0;font-family:${BODY_FONT};font-size:11px;color:rgba(93,15,23,0.55);">
  &copy; ${year} VYA.
  </p>
 </td>
 </tr>

 </table>

 </td>
 </tr>
</table>

</body>
</html>`;
 return minifyHtml(html);
}

function emailShell(content: string): string {
 const year = new Date().getFullYear();
 const html = `<!DOCTYPE html>
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
u + .body { background-color: #FFFDF8 !important; }
u + .body .wrapper { background-color: #FFFDF8 !important; }
[data-ogsc] body, [data-ogsc] .wrapper { background-color: #FFFDF8 !important; }
[data-ogsc] .content { background-color: #ffffff !important; }
[data-ogsc] p, [data-ogsc] span, [data-ogsc] h2 { color: #5D0F17 !important; }
@media (prefers-color-scheme: dark) {
 body, .wrapper { background-color: #FFFDF8 !important; }
 .content { background-color: #ffffff !important; }
 .content h2 { color: #5D0F17 !important; }
 .content p { color: #5D0F17 !important; }
 .btn { background-color: #5D0F17 !important; color: #FFFDF8 !important; }
 .footer { color: rgba(93,15,23,0.45) !important; }
}
</style>
</head>
<body class="body" style="margin:0;padding:0;background-color:#FFFDF8;" bgcolor="#FFFDF8">
<div class="wrapper" style="background-color:#FFFDF8;padding:40px 16px;" bgcolor="#FFFDF8">
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
 return minifyHtml(html);
}

function formatEmailPrice(price: number | string, currency: string): string {
 const p = typeof price === "string" ? parseFloat(price) : price;
 const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
 return `${symbol}${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}`;
}

/** Append UTM parameters to any VYA URL. */
function withUtm(url: string, campaign: string, content?: string): string {
 const sep = url.includes("?") ? "&" : "?";
 const base = `${url}${sep}utm_source=email&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}`;
 return content ? `${base}&utm_content=${encodeURIComponent(content)}` : base;
}

function productViaUrl(p: DBProduct, campaign: string): string {
 const base = `${BASE_URL}/products/${p.store_slug}-${p.id}`;
 return withUtm(base, campaign);
}

export async function sendGiveawayConfirmation(email: string, referralCode: string) {
 const resend = getResend();
 const referralLink = withUtm(`${BASE_URL}/waitlist?ref=${referralCode}`, "giveaway", "referral_link");

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
 const referralLink = withUtm(`${BASE_URL}/waitlist?ref=${referralCode}`, "giveaway", "referral_link");
 const isComplete = friendNumber === 2;

 const subject = isComplete
 ? "You're officially entered — VYA Giveaway"
 : "1 of 2 friends entered — VYA Giveaway";

 const heading = isComplete ? "You're officially entered!" : "1 down, 1 to go.";

 const body = isComplete
 ? `<p>Both of your friends have entered the giveaway. You're now officially in the running to win a $1,000 shopping spree on VYA!</p>
 <p class="muted">We'll be in touch when we pick a winner. In the meantime, start browsing.</p>
 <a href="${withUtm(BASE_URL, "giveaway", "start_shopping")}" class="btn">Start Shopping</a>`
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
 const referralLink = withUtm(`${BASE_URL}/waitlist?ref=${referralCode}`, "giveaway_reminder", "referral_link");

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

export async function sendReferralInsiderWelcomeEmail(email: string, firstName?: string) {
 const resend = getResend();
 const name = firstName?.trim() || "there";

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "You're a VYA Insider ✦",
 html: emailShell(`
 <h2>You're officially a VYA Insider.</h2>
 <p>Hi ${name} — you brought two friends to VYA, and that means you're in.</p>
 <p>As a VYA Insider, you'll get our bimonthly newsletter with inside scoops on the best finds, styling tips, and trend breakdowns — before anyone else hears about them.</p>
 <p class="muted">Keep an eye on your inbox. Your first issue is on its way.</p>
 `),
 });
}

export async function sendMembershipConfirmation(email: string) {
 const resend = getResend();
 const insiderUrl = withUtm(`${BASE_URL}/account/insider`, "membership_confirmation");

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

export type FavoriteActivityProduct = {
 title: string;
 image: string | null;
 storeName: string;
 productUrl: string;
 price?: number;
 currency?: string;
 clickCount?: number;
};

export async function sendFavoriteActivityNotification(
 email: string,
 products: FavoriteActivityProduct[],
) {
 if (products.length === 0) return;
 const resend = getResend();

 const isSingle = products.length === 1;
 const subject = isSingle
 ? "Someone else is looking at your saved piece"
 : `${products.length} of your saved pieces are getting attention`;

 const intro = isSingle
 ? `<p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Something you saved is <strong>getting attention.</strong>
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
 Others are looking at it right now &mdash; and vintage is always one of a kind.
 If you love it, don&rsquo;t wait.
 </p>`
 : `<p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Some pieces you&rsquo;ve saved are <strong>getting attention.</strong>
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
 Others are looking at the same things. Vintage is one of a kind &mdash; don&rsquo;t wait.
 </p>`;

 const productBlocks = products.map((p, i) => {
 const imgBlock = p.image
 ? `<a href="${p.productUrl}" style="text-decoration:none;display:block;margin:28px 0 16px;">
 <img src="${p.image}" alt="${p.title.replace(/"/g, "&quot;")}" width="480"
 style="display:block;width:100%;height:auto;max-height:320px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="height:20px;"></div>`;

 const socialProof = p.clickCount && p.clickCount >= 5
 ? `<p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(93,15,23,0.55);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 10px;">${p.clickCount} people have viewed this recently</p>`
 : "";

 const priceBlock = p.price && p.currency
 ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 12px;">
 ${formatEmailPrice(p.price, p.currency)}
 </p>`
 : "";

 return `
 ${imgBlock}
 <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${p.storeName}</p>
 <a href="${p.productUrl}" style="text-decoration:none;">
 <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.35;margin:0 0 8px;">${p.title}</p>
 </a>
 ${socialProof}
 ${priceBlock}
 <p style="font-size:14px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;
 line-height:1.75;margin:0 0 12px;">
 Once it&rsquo;s gone, it&rsquo;s gone forever.
 </p>
 <a href="${p.productUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:11px 28px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;margin-bottom:36px;">View Item</a>
 ${i < products.length - 1 ? '<hr style="border:none;border-top:1px solid rgba(93,15,23,0.12);margin:8px 0 0;" />' : ""}
 `;
 }).join("");

 const content = intro + productBlocks;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject,
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
 const url = productViaUrl(p, "insider_new_arrivals");
 // Escape & in URLs for valid HTML attributes — Shopify CDN URLs contain &width=, &v=, etc.
 const safeImgSrc = p.image ? p.image.replace(/&/g, "&amp;") : null;
 const imgBlock = safeImgSrc
 ? `<img src="${safeImgSrc}" alt="${p.title.replace(/"/g, "&quot;")}" width="240"
 style="display:block;width:100%;height:220px;object-fit:cover;" border="0" />`
 : `<div style="width:100%;height:220px;background:rgba(93,15,23,0.06);"></div>`;

 const priceStr = formatEmailPrice(p.price, p.currency);
 const compareStr = p.compare_at_price ? formatEmailPrice(p.compare_at_price, p.currency) : null;
 const priceBlock = compareStr
 ? `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>
 <span style="color:rgba(93,15,23,0.4);font-size:12px;text-decoration:line-through;margin-left:6px;
 font-family:Georgia,'Times New Roman',serif;">${compareStr}</span>`
 : `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>`;

 // Use a table layout so each element is its own link-safe block.
 // Avoid <p> inside <a> — email clients break the outer <a> at block elements.
 const safeUrl = url.replace(/&/g, "&amp;");
 return `
 <a href="${safeUrl}" style="display:block;text-decoration:none;color:inherit;">
 ${imgBlock}
 </a>
 <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 margin:10px 0 3px;font-family:Georgia,'Times New Roman',serif;">${p.store_name}</div>
 <div style="font-size:13px;color:#5D0F17;margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;
 line-height:1.35;">${p.title}</div>
 <div style="margin:0 0 14px;">${priceBlock}</div>
 <a href="${safeUrl}" style="display:inline-block;border:1px solid #5D0F17;color:#5D0F17;padding:8px 18px;
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

 const insiderUrl = withUtm(`${BASE_URL}/account/insider`, "insider_new_arrivals");

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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Shop VYA Insider</a>
 </div>
 `;

 let sent = 0;
 let failed = 0;

 for (const email of emails) {
 const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
 const html = viaShell("VYA Insider", content, unsubUrl);
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

/**
 * Send a new arrivals email to all approved VYA platform users.
 * Different from Insider — goes to everyone approved on the platform.
 */
/**
 * Known designer brands — checked against the full title (not just the first word)
 * so "Vintage Chanel Bag" and "Beige Burberry Coat" both resolve correctly.
 * Multi-word brands listed before single-word ones so longer matches win.
 */
const KNOWN_BRANDS: string[] = [
 // Multi-word first (order matters — longer match wins)
 "Alexander McQueen", "Alexander Wang",
 "Ann Demeulemeester",
 "Betsey Johnson",
 "Bob Mackie",
 "Bottega Veneta",
 "Calvin Klein",
 "Christian Dior", "Christian Louboutin",
 "Comme des Garçons", "Comme des Garcons",
 "David Yurman",
 "Dolce & Gabbana", "Dolce and Gabbana",
 "Dries Van Noten",
 "Emporio Armani",
 "Gianfranco Ferre", "Gianfranco Ferré",
 "Gianvito Rossi",
 "Giorgio Armani",
 "Helmut Lang",
 "Issey Miyake",
 "Jean Paul Gaultier",
 "Jil Sander",
 "Jimmy Choo",
 "Kate Spade",
 "Louis Vuitton",
 "Maison Margiela",
 "Manolo Blahnik",
 "Marc Jacobs",
 "Michael Kors",
 "Moschino Cheap and Chic",
 "Plein Sud",
 "Rachel Zoe",
 "Ralph Lauren",
 "Roberto Cavalli",
 "Roger Vivier",
 "Saint Laurent",
 "Salvatore Ferragamo",
 "Sergio Rossi",
 "Stella McCartney",
 "Thierry Mugler",
 "Tommy Hilfiger",
 "Tory Burch",
 "Van Cleef & Arpels", "Van Cleef",
 "Victoria Beckham",
 "Vivienne Westwood",
 "Yves Saint Laurent",
 // Single-word
 "Balenciaga", "Balmain", "Bulgari",
 "Cartier", "Celine", "Céline", "Chanel", "Chloe", "Chloé", "Courrèges", "Courreges",
 "Dior",
 "Fendi", "Ferragamo",
 "Givenchy", "Gucci",
 "Hermès", "Hermes",
 "Kenzo",
 "Lacroix", "Lanvin", "Lancome",
 "Marni", "Moschino", "Mugler",
 "Prada", "Pucci",
 "Schiaparelli",
 "Tod's", "Tods",
 "Ungaro",
 "Valentino", "Versace",
 "Zara",
 // Additional brands seen in VYA inventory
 "AllSaints", "Burberry",
];

/** Search the product title for any known designer brand.
 * Returns the canonical brand name, or null if none found. */
function extractBrand(title: string): string | null {
 const t = title.toLowerCase();
 for (const brand of KNOWN_BRANDS) {
 if (t.includes(brand.toLowerCase())) return brand;
 }
 return null;
}

/** Sort products by brand frequency (most items first), then alphabetically within same count.
 * Only known designer brands count — unrecognised titles sort to the end.
 * Returns sorted products + the top brand names in order. */
function sortByBrand(products: DBProduct[]): { sorted: DBProduct[]; topBrands: string[] } {
 const brandCount = new Map<string, number>();
 for (const p of products) {
 const b = extractBrand(p.title);
 if (b) brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
 }

 // Brand order: most items first, then alphabetical for ties
 const brandOrder = [...brandCount.entries()]
 .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
 .map(([brand]) => brand);

 const sorted = [...products].sort((a, b) => {
 const ab = extractBrand(a.title);
 const bb = extractBrand(b.title);
 const ai = ab ? brandOrder.indexOf(ab) : 9999;
 const bi = bb ? brandOrder.indexOf(bb) : 9999;
 return ai - bi;
 });

 return { sorted, topBrands: brandOrder };
}

export async function sendNewArrivalsEmail(
 emails: string[],
 products: DBProduct[],
 preserveOrder = false
): Promise<{ sent: number; failed: number }> {
 if (emails.length === 0 || products.length === 0) return { sent: 0, failed: 0 };

 const resend = getResend();
 const newArrivalsUrl = withUtm(`${BASE_URL}/new-arrivals`, "new_arrivals_email", "view_all");

 // Hand-curated picks keep the exact order they were chosen; the automatic
 // selection gets grouped by brand for a nicer flow.
 const sortedProducts = preserveOrder ? products : sortByBrand(products).sorted;
 const subject = "New Arrivals Sourced Just for You";
 // Cap at 25 pieces.
 const display = sortedProducts.slice(0, 25);

 function productCell(p: DBProduct): string {
 const url = productViaUrl(p, "new_arrivals_email");
 // Escape & in URLs for valid HTML attributes — Shopify CDN URLs contain &width=, &v=, etc.
 const safeImgSrc = p.image ? p.image.replace(/&/g, "&amp;") : null;
 // height:auto shows the FULL product image at its natural aspect ratio — bigger,
 // and nothing cropped off (the old fixed 220px + object-fit:cover cut pieces off).
 const imgBlock = safeImgSrc
 ? `<img src="${safeImgSrc}" alt="${p.title.replace(/"/g, "&quot;")}" width="240"
 style="display:block;width:100%;height:auto;" border="0" />`
 : `<div style="width:100%;height:300px;background:rgba(93,15,23,0.06);"></div>`;

 const priceStr = formatEmailPrice(p.price, p.currency);
 const compareStr = p.compare_at_price ? formatEmailPrice(p.compare_at_price, p.currency) : null;
 const priceBlock = compareStr
 ? `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>
 <span style="color:rgba(93,15,23,0.4);font-size:12px;text-decoration:line-through;margin-left:6px;
 font-family:Georgia,'Times New Roman',serif;">${compareStr}</span>`
 : `<span style="color:#5D0F17;font-size:13px;font-family:Georgia,'Times New Roman',serif;">${priceStr}</span>`;

 // Avoid <p> inside <a> — email clients break the outer <a> at block elements.
 const safeUrl = url.replace(/&/g, "&amp;");
 return `
 <a href="${safeUrl}" style="display:block;text-decoration:none;color:inherit;">
 ${imgBlock}
 </a>
 <div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 margin:10px 0 3px;font-family:Georgia,'Times New Roman',serif;">${p.store_name}</div>
 <div style="font-size:13px;color:#5D0F17;margin:0 0 5px;font-family:Georgia,'Times New Roman',serif;
 line-height:1.35;">${p.title}</div>
 <div style="margin:0 0 14px;">${priceBlock}</div>
 <a href="${safeUrl}" style="display:inline-block;border:1px solid #5D0F17;color:#5D0F17;padding:8px 18px;
 text-decoration:none;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 `;
 }

 const rows: string[] = [];
 for (let i = 0; i < display.length; i += 2) {
 const left = display[i];
 const right = display[i + 1] || null;
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

 const content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 These pieces won&rsquo;t be here for long.
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;
 line-height:1.75;margin:0 0 24px;">
 Every piece on VYA is one-of-a-kind &mdash; once it&rsquo;s gone, it&rsquo;s gone forever. No restocks, no second chances.
 </p>
 <div style="text-align:center;margin-bottom:36px;">
 <a href="${newArrivalsUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Shop New Arrivals</a>
 </div>
 <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
 ${rows.join("")}
 </table>
 <div style="text-align:center;margin-top:8px;padding-top:28px;border-top:1px solid rgba(93,15,23,0.12);">
 <a href="${newArrivalsUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Shop New Arrivals</a>
 </div>
 `;

 let sent = 0;
 let failed = 0;

 for (const email of emails) {
 const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
 const html = viaShell("New Arrivals", content, unsubUrl);
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject,
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

/**
 * Re-engagement email for approved users who have never logged in.
 * Subject: Great finds are waiting for you
 */
export async function sendReengagementEmail(
 emails: { email: string; firstName: string | null }[]
): Promise<{ sent: number; failed: number }> {
 const resend = getResend();
 let sent = 0;
 let failed = 0;

 const shopUrl = `${BASE_URL}/browse`;

 const content = `
 <h1 style="font-size:26px;font-weight:400;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 margin:0 0 20px;line-height:1.3;">Great finds are waiting for you.</h1>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 16px;">
 You&rsquo;ve been approved to shop VYA &mdash; the curated vintage &amp; secondhand platform where every piece is one-of-a-kind.
 </p>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 32px;">
 Whether you&rsquo;re looking for a chic ballet flat, a designer shoulder bag, or that rare find you&rsquo;ve been hunting &mdash;
 it&rsquo;s all here. Once it&rsquo;s gone, it&rsquo;s gone for good.
 </p>
 <div style="text-align:center;margin-bottom:40px;">
 <a href="${shopUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 40px;
 text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Sign In &amp; Start Shopping</a>
 </div>
 <p style="font-size:13px;color:rgba(93,15,23,0.55);font-family:Georgia,'Times New Roman',serif;
 line-height:1.75;margin:0;">
 New pieces drop weekly from our network of curated vintage stores.
 </p>
 `;

 for (const { email, firstName } of emails) {
 const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
 const greeting = firstName ? firstName.trim() : null;
 const subtitle = greeting ? `Hi ${greeting} — welcome to VYA` : "Welcome to VYA";
 const html = viaShell(subtitle, content, unsubUrl);
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "Great finds are waiting for you — VYA",
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

type PriceDropItem = {
 product_id: number;
 product_title: string;
 product_image: string | null;
 store_name: string;
 store_slug: string;
 old_price: number;
 new_price: number;
};

/**
 * Send price drop notification emails.
 * Groups multiple drops per user into a single email.
 * `notifications` is the flat list from getPriceDropCandidates.
 */
export async function sendPriceDropEmails(
 notifications: Array<{ user_id: string; email: string } & PriceDropItem>
): Promise<{ sent: number; failed: number }> {
 if (notifications.length === 0) return { sent: 0, failed: 0 };

 const resend = getResend();

 // Group by user
 const byUser = new Map<string, { email: string; items: PriceDropItem[] }>();
 for (const n of notifications) {
 if (!byUser.has(n.user_id)) {
 byUser.set(n.user_id, { email: n.email, items: [] });
 }
 byUser.get(n.user_id)!.items.push({
 product_id: n.product_id,
 product_title: n.product_title,
 product_image: n.product_image,
 store_name: n.store_name,
 store_slug: n.store_slug,
 old_price: n.old_price,
 new_price: n.new_price,
 });
 }

 let sent = 0;
 let failed = 0;

 for (const [, { email, items }] of byUser) {
 const itemsHtml = items.map((item) => {
 const productUrl = withUtm(`${BASE_URL}/products/${item.store_slug}-${item.product_id}`, "price_drop");
 const safeUrl = productUrl.replace(/&/g, "&amp;");
 const safeImgSrc = item.product_image ? item.product_image.replace(/&/g, "&amp;") : null;
 const imgBlock = safeImgSrc
 ? `<img src="${safeImgSrc}" alt="${item.product_title.replace(/"/g, "&quot;")}" width="120"
 style="display:block;width:120px;height:120px;object-fit:cover;flex-shrink:0;" border="0" />`
 : `<div style="width:120px;height:120px;background:rgba(93,15,23,0.06);flex-shrink:0;"></div>`;

 const oldPriceStr = `$${item.old_price.toFixed(0)}`;
 const newPriceStr = `$${item.new_price.toFixed(0)}`;
 const savings = Math.round(((item.old_price - item.new_price) / item.old_price) * 100);

 return `
 <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;border-bottom:1px solid rgba(93,15,23,0.08);padding-bottom:24px;">
 <tr>
 <td width="130" valign="top" style="padding-right:16px;">
 <a href="${safeUrl}" style="display:block;text-decoration:none;">${imgBlock}</a>
 </td>
 <td valign="top">
 <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 margin-bottom:4px;font-family:Georgia,'Times New Roman',serif;">${item.store_name}</div>
 <div style="font-size:14px;color:#5D0F17;margin-bottom:8px;font-family:Georgia,'Times New Roman',serif;line-height:1.35;">
 ${item.product_title}
 </div>
 <div style="margin-bottom:12px;">
 <span style="font-size:16px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;font-weight:600;">${newPriceStr}</span>
 <span style="font-size:13px;color:rgba(93,15,23,0.4);text-decoration:line-through;margin-left:8px;
 font-family:Georgia,'Times New Roman',serif;">${oldPriceStr}</span>
 <span style="font-size:11px;color:#5D0F17;background:rgba(93,15,23,0.08);padding:2px 8px;
 margin-left:8px;font-family:Georgia,'Times New Roman',serif;">${savings}% off</span>
 </div>
 <a href="${safeUrl}"
 style="display:inline-block;border:1px solid #5D0F17;color:#5D0F17;padding:8px 18px;
 text-decoration:none;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 </td>
 </tr>
 </table>
 `;
 }).join("");

 const content = `
 <h1 style="font-size:22px;font-weight:400;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 margin:0 0 16px;line-height:1.3;">Your saved ${items.length > 1 ? "pieces" : "piece"} ${items.length > 1 ? "just got" : "just got"} more affordable.</h1>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 32px;">
 The ${items.length > 1 ? "pieces" : "piece"} you had your eye on ${items.length > 1 ? "have" : "has"} dropped in price &mdash; and you won&rsquo;t want to miss this.
 These are one-of-a-kind vintage finds. Once ${items.length > 1 ? "they&rsquo;re" : "it&rsquo;s"} gone, ${items.length > 1 ? "they&rsquo;re" : "it&rsquo;s"} gone for good.
 </p>
 ${itemsHtml}
 `;

 const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
 const subject = items.length > 1
 ? `Price drops on your favorites — don't miss out`
 : `Your saved piece just dropped in price`;

 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject,
 html: viaShell("Your Favorites", content, unsubUrl),
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
 const VIA_EMAIL = "hana@vyaplatform.com";
 const DASHBOARD_URL = "https://vyaplatform.com/store/dashboard";

 const imageBlock = details.imageUrl
 ? `<div style="text-align: center; margin: 20px 0;">
 <img src="${details.imageUrl}" alt="Sourcing request item" style="max-width: 100%; max-height: 320px; object-fit: contain;" />
 </div>`
 : "";

 // Store email: no customer contact info — only shared after offer is accepted
 const storeHtml = emailShell(`
 <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);margin:0 0 8px;">Sourcing Request from VYA</p>
 <h2 style="margin-bottom:20px;">New Sourcing Request</h2>
 <p style="font-size:14px;color:rgba(93,15,23,0.7);margin:0 0 20px;">A customer is looking for the following item. If you have something that matches, submit your offer through your store dashboard.</p>
 ${imageBlock}
 <table style="width:100%;border-collapse:collapse;margin:20px 0;">
 <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);width:120px;">Description</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.description}</td></tr>
 <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Budget</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">$${details.priceMin} – $${details.priceMax}</td></tr>
 <tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Condition</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.condition}</td></tr>
 ${details.size ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Size</td><td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.1);font-size:14px;color:#5D0F17;">${details.size}</td></tr>` : ""}
 <tr><td style="padding:8px 0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(93,15,23,0.5);">Deadline</td><td style="padding:8px 0;font-size:14px;color:#5D0F17;">${details.deadline}</td></tr>
 </table>
 <div style="text-align:center;margin:32px 0;">
 <a href="${DASHBOARD_URL}" style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;text-decoration:none;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;padding:14px 32px;">Submit Your Offer</a>
 </div>
 <p style="font-size:12px;color:rgba(93,15,23,0.4);text-align:center;">Customer contact details are only shared after they accept your offer.</p>
 `);

 // Admin email: full details including customer info
 const adminHtml = emailShell(`
 <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);margin:0 0 8px;">Sourcing Request — Admin Copy</p>
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
 `);

 const isDev = process.env.NODE_ENV === "development";
 const storeRecipients = isDev ? [] : storeEmails.filter((e) => e !== VIA_EMAIL);

 // Admin copy with full customer details
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: VIA_EMAIL,
 subject: "New Sourcing Request — VYA Admin",
 html: adminHtml,
 });
 } catch (err) {
 console.error("Failed to send sourcing admin email:", err);
 }

 // Store copy without customer contact info — send in batches to stay under rate limit
 for (let i = 0; i < storeRecipients.length; i++) {
 const email = storeRecipients[i];
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "New Sourcing Request — Submit Your Offer",
 html: storeHtml,
 });
 } catch (err) {
 console.error(`Failed to send sourcing request email to ${email}:`, err);
 }
 // Pause every 4 sends to stay under Resend's 5 req/sec rate limit
 if ((i + 1) % 4 === 0) {
 await new Promise((r) => setTimeout(r, 1000));
 }
 }
}

/** Weekly listing-quality nudge to a store partner — which listings need fixing. */
export async function sendStoreListingDigest(params: {
 email: string;
 storeName: string;
 flagged: number;
 total?: number;
 counts: { noDescription: number; noSizing: number; noImage: number };
 products: { title: string; url: string; flags: string[] }[];
 dashboardUrl: string;
}): Promise<void> {
 const resend = getResend();
 const { counts } = params;
 const countLine = [
 counts.noDescription ? `${counts.noDescription} missing a description` : null,
 counts.noSizing ? `${counts.noSizing} missing a size or measurements` : null,
 counts.noImage ? `${counts.noImage} missing an image` : null,
 ].filter(Boolean).join(" · ");

 const items = params.products
 .map(
 (p) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid rgba(93,15,23,0.08);font-size:14px;color:#5D0F17;"><a href="${p.url}" style="color:#5D0F17;text-decoration:none;">${p.title}</a></td>
  <td style="padding:10px 0;border-bottom:1px solid rgba(93,15,23,0.08);font-size:12px;color:rgba(93,15,23,0.5);text-align:right;">${p.flags.join(", ")}</td>
 </tr>`,
 )
 .join("");

 const html = `<div style="background:#FFFDF8;padding:32px 20px;font-family:Georgia,'Times New Roman',serif;color:#5D0F17;">
 <div style="max-width:560px;margin:0 auto;">
 <h1 style="font-size:23px;font-weight:500;margin:0 0 10px;">${params.storeName} — listings to tidy up</h1>
 <p style="font-size:15px;line-height:1.6;color:rgba(93,15,23,0.7);margin:0 0 18px;">
  <strong>${params.flagged}</strong> ${params.flagged === 1 ? "listing" : "listings"} on VYA ${params.flagged === 1 ? "is" : "are"} missing details that help ${params.flagged === 1 ? "it" : "them"} sell. Completing ${params.flagged === 1 ? "it" : "them"} gets more views and faster sales.
 </p>
 <p style="font-size:13px;color:rgba(93,15,23,0.55);margin:0 0 20px;">${countLine}</p>
 <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${items}</table>
 <a href="${params.dashboardUrl}" style="display:inline-block;background:#5D0F17;color:#FFFDF8;text-decoration:none;padding:12px 24px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">See all in your dashboard</a>
 <p style="font-size:12px;color:rgba(93,15,23,0.4);margin:24px 0 0;">Update these on your store and they'll sync to VYA automatically.</p>
 </div>
</div>`;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: params.email,
 subject: `${params.flagged} listing${params.flagged !== 1 ? "s" : ""} to complete — ${params.storeName}`,
 html,
 });
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
 const requestUrl = withUtm(`${BASE_URL}/account/sourcing/${details.requestId}`, "sourcing_offer");
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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:12px 24px;font-size:13px;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">
 Check Admin →
 </a>
 `;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: "hana@vyaplatform.com",
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

 // Auth.js v5 hashes the token using Web Crypto: SHA-256(rawToken + secret)
 const encoder = new TextEncoder();
 const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(`${rawToken}${secret}`));
 const hashedToken = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

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
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,serif;margin:0 0 16px;">${greeting}</p>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,serif;line-height:1.75;margin:0 0 24px;">
 You have exclusive access to shop the VYA pilot, our curated edit of independent vintage and secondhand stores, all in one place.
 </p>
 <a href="${magicLink}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 32px;font-size:12px;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-family:Georgia,serif;">
 <span style="color:#FFFDF8 !important;">Start Shopping</span>
 </a>
 <div style="margin-top:40px;padding-top:32px;border-top:1px solid rgba(93,15,23,0.1);">
 <p style="font-size:13px;color:#5D0F17;font-family:Georgia,serif;font-style:italic;margin:0 0 6px;">From the founder of VYA:</p>
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,serif;line-height:1.8;margin:0 0 24px;">
 I started VYA in January with an idea in mind that there are incredible vintage stores around the world, but not one place to discover them all. Since then, the VYA community has grown to over 5,000 people, and 40+ partner stores. I am so excited for you to shop the amazing pieces we have. Every store has been handpicked by me, with the intention to provide the best quality. Thank you for supporting me, and stay tuned for more.
 </p>
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,serif;line-height:1.8;margin:0;">
 Xoxo,<br/>
 <strong>Hana Elster</strong><br/>
 <span style="font-size:12px;color:rgba(93,15,23,0.6);">Founder of VYA</span>
 </p>
 </div>
 <p style="font-size:12px;color:rgba(93,15,23,0.4);margin-top:32px;font-family:Georgia,serif;">
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

export async function sendFeedbackEmail(
 emails: string[]
): Promise<{ sent: number; failed: number }> {
 const resend = getResend();
 let sent = 0;
 let failed = 0;

 const content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,serif;margin:0 0 16px;">Hi,</p>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,serif;line-height:1.75;margin:0 0 24px;">
 We're building VYA around you — and we'd love to hear what you actually think.
 </p>
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,serif;line-height:1.75;margin:0 0 24px;">
 It takes 2 minutes and genuinely shapes what we build next.
 </p>
 <a href="https://form.typeform.com/to/ssrEgHZ1"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 32px;font-size:12px;text-decoration:none;letter-spacing:0.12em;text-transform:uppercase;font-family:Georgia,serif;">
 <span style="color:#FFFDF8 !important;">Share Your Feedback</span>
 </a>
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,serif;line-height:1.8;margin:40px 0 0;">
 Thank you for being part of this,<br/>
 <strong>Hana</strong><br/>
 <span style="font-size:12px;color:rgba(93,15,23,0.6);">Founder of VYA</span>
 </p>
 `;

 for (const email of emails) {
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "We'd love your feedback 💌",
 html: viaShell("Help us build VYA.", content),
 });
 sent++;
 } catch (err) {
 console.error(`[FeedbackEmail] Failed to send to ${email}:`, err);
 failed++;
 }
 // Small delay to avoid rate limits
 await new Promise((r) => setTimeout(r, 100));
 }

 return { sent, failed };
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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:12px 24px;font-size:13px;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;">
 Update Credentials →
 </a>
 `;
 await resend.emails.send({
 from: FROM_EMAIL,
 to: "hana@vyaplatform.com",
 subject: "Action needed — Shopify Collabs credentials expired",
 html: viaShell("Collabs Credentials Expired", content),
 });
}

export async function sendAbandonedCartEmail(
 email: string,
 items: Array<{
 productTitle: string;
 productImage: string | null;
 storeName: string;
 productUrl: string;
 price?: number;
 currency?: string;
 }>,
): Promise<void> {
 const resend = getResend();

 let content: string;

 if (items.length === 1) {
 // Single-item: large hero format
 const { productTitle, productImage, storeName, productUrl, price, currency } = items[0];
 const imgBlock = productImage
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;margin:32px 0 24px;">
 <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="480"
 style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="height:28px;"></div>`;
 const priceBlock = price && currency
 ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 28px;">${formatEmailPrice(price, currency)}</p>`
 : `<div style="height:16px;"></div>`;
 content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Vintage doesn&rsquo;t wait around.
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
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Complete Your Purchase</a>
 `;
 } else {
 // Multi-item: list format
 const itemsHtml = items.map(({ productTitle, productImage, storeName, productUrl, price, currency }) => {
 const img = productImage
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;width:80px;flex-shrink:0;">
 <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="80"
 style="display:block;width:80px;height:80px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="width:80px;height:80px;background:#ede9e0;flex-shrink:0;"></div>`;
 const priceStr = price && currency ? formatEmailPrice(price, currency) : "";
 return `
 <tr>
 <td style="padding:16px 0;border-bottom:1px solid rgba(93,15,23,0.08);">
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
 <tr>
 <td style="width:80px;vertical-align:top;">${img}</td>
 <td style="padding-left:16px;vertical-align:top;">
 <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 4px;">${storeName}</p>
 <a href="${productUrl}" style="text-decoration:none;">
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.3;margin:0 0 6px;">${productTitle}</p>
 </a>
 ${priceStr ? `<p style="font-size:13px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 10px;">${priceStr}</p>` : ""}
 <a href="${productUrl}"
 style="display:inline-block;border:1px solid rgba(93,15,23,0.4);color:#5D0F17 !important;padding:6px 18px;
 text-decoration:none;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 </td>
 </tr>
 </table>
 </td>
 </tr>`;
 }).join("");

 content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Vintage doesn&rsquo;t wait around.
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 24px;">
 You left ${items.length} items in your cart &mdash; and each one is one of a kind.
 </p>
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
 ${itemsHtml}
 </table>
 `;
 }

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "Get it before it's gone forever",
 html: viaShell("Your Cart", content),
 });
}

export type TrendingEmailProduct = {
 title: string;
 image: string | null;
 storeName: string;
 productUrl: string;
 favoriteCount: number;
 price?: number;
 currency?: string;
};

export async function sendTrendingItemEmail(
 email: string,
 products: TrendingEmailProduct[],
): Promise<void> {
 if (products.length === 0) return;
 const resend = getResend();

 const isSingle = products.length === 1;
 const subject = isSingle ? "Your saved item is trending" : `${products.length} of your saved items are trending`;

 const intro = isSingle
 ? `<p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Something you saved is <strong>trending.</strong>
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
 ${products[0].favoriteCount} people have saved this piece &mdash; and there&rsquo;s only one.
 If you love it, don&rsquo;t wait.
 </p>`
 : `<p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Some things you&rsquo;ve saved are <strong>trending.</strong>
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
 Others are eyeing the same pieces. If you love them, don&rsquo;t wait.
 </p>`;

 const productBlocks = products.map((p) => {
 const imgBlock = p.image
 ? `<a href="${p.productUrl}" style="text-decoration:none;display:block;margin:28px 0 16px;">
 <img src="${p.image}" alt="${p.title.replace(/"/g, "&quot;")}" width="480"
 style="display:block;width:100%;height:auto;max-height:320px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="height:20px;"></div>`;

 const priceBlock = p.price && p.currency
 ? `<p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 12px;">
 ${formatEmailPrice(p.price, p.currency)}
 </p>`
 : "";

 return `
 ${imgBlock}
 <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${p.storeName}</p>
 <a href="${p.productUrl}" style="text-decoration:none;">
 <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.35;margin:0 0 8px;">${p.title}</p>
 </a>
 ${priceBlock}
 <p style="font-size:12px;color:rgba(93,15,23,0.5);font-family:Georgia,'Times New Roman',serif;margin:0 0 12px;">
 ${p.favoriteCount} ${p.favoriteCount === 1 ? "person has" : "people have"} saved this &mdash; once it&rsquo;s gone, it&rsquo;s gone.
 </p>
 <a href="${p.productUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:11px 28px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;margin-bottom:36px;">View Item</a>
 ${products.indexOf(p) < products.length - 1 ? '<hr style="border:none;border-top:1px solid rgba(93,15,23,0.12);margin:8px 0 0;" />' : ""}
 `;
 }).join("");

 const content = intro + productBlocks;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject,
 html: viaShell("Trending", content),
 });
}

/**
 * Send a post-popup thank-you email to NYC pop-up attendees.
 */
export async function sendPopupThankYouEmail(
 emails: string[]
): Promise<{ sent: number; failed: number }> {
 if (emails.length === 0) return { sent: 0, failed: 0 };

 const resend = getResend();

 const content = `
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 16px;
 font-family:Georgia,'Times New Roman',serif;">Hi,</p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 16px;
 font-family:Georgia,'Times New Roman',serif;">
 Thank you so much for coming to the VYA NYC pop-up this past weekend. It honestly meant the world to see so many of you show up, support, and experience VYA in real life.
 </p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 24px;
 font-family:Georgia,'Times New Roman',serif;">
 Being able to connect with you in person, hear your thoughts, and watch you discover pieces from our partner stores was incredibly special.
 </p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 12px;
 font-family:Georgia,'Times New Roman',serif;">
 If you have a moment, I'd really love your feedback as we continue building — you can share it here:
 </p>
 <div style="margin:0 0 28px;">
 <a href="https://form.typeform.com/to/Vgzmmp5a"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 36px;
 text-decoration:none;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Share Feedback</a>
 </div>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 12px;
 font-family:Georgia,'Times New Roman',serif;">
 And if you didn't get the chance to shop everything (or just want more), you can browse all of our partner stores online at:
 </p>
 <div style="margin:0 0 16px;">
 <a href="https://vyaplatform.com"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 36px;
 text-decoration:none;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">Shop VYA</a>
 </div>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 28px;
 font-family:Georgia,'Times New Roman',serif;">
 Use code <strong>NYC</strong> to skip the waitlist!
 </p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 4px;
 font-family:Georgia,'Times New Roman',serif;">
 Thank you again for being part of this — it is just the beginning.
 </p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:24px 0 0;
 font-family:Georgia,'Times New Roman',serif;">
 xoxo,<br/>
 <strong>Hana</strong><br/>
 <span style="opacity:0.65;font-size:13px;">Founder of VYA</span>
 </p>
 `;

 const html = viaShell("Thank You for Coming to the VYA NYC Pop-Up 🤍", content);

 let sent = 0;
 let failed = 0;

 for (const email of emails) {
 try {
 await resend.emails.send({
 from: "Hana @ VYA <hana@vyaplatform.com>",
 to: email,
 subject: "Thank You for Coming to the VYA NYC Pop-Up 🤍",
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

/**
 * Notify a store that they made a sale attributed to VYA.
 * Only called after an admin manually matches the conversion.
 */
export async function sendStoreSaleEmail({
 storeEmail,
 storeName,
 storeSlug,
 dashboardToken,
 orderTotal,
 currency,
 productName,
 orderId,
 timestamp,
}: {
 storeEmail: string;
 storeName: string;
 storeSlug: string;
 dashboardToken: string;
 orderTotal: number;
 currency: string;
 productName?: string | null;
 orderId: string;
 timestamp: string;
}): Promise<void> {
 const resend = getResend();

 const dashboardUrl = `${BASE_URL}/for-stores/analytics?store=${storeSlug}&token=${dashboardToken}`;
 const formattedTotal = new Intl.NumberFormat("en-US", {
 style: "currency",
 currency: currency || "USD",
 maximumFractionDigits: 0,
 }).format(orderTotal);
 const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
 month: "long",
 day: "numeric",
 year: "numeric",
 });

 const content = `
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;">
 Hi ${storeName},
 </p>
 <p style="font-size:16px;color:#5D0F17;line-height:1.7;margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;">
 You made a sale through VYA.
 </p>

 <div style="background:#FFFDF8;border:1px solid rgba(93,15,23,0.15);padding:24px 28px;margin:0 0 28px;">
 ${productName ? `<p style="font-size:15px;color:#5D0F17;margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:600;">${productName}</p>` : ""}
 <p style="font-size:22px;font-weight:700;color:#5D0F17;margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;">${formattedTotal}</p>
 <p style="font-size:12px;color:rgba(93,15,23,0.5);margin:0;font-family:Georgia,'Times New Roman',serif;text-transform:uppercase;letter-spacing:0.1em;">
 ${formattedDate} · Order #${orderId}
 </p>
 </div>

 <p style="font-size:15px;color:#5D0F17;line-height:1.7;margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;">
 A VYA member visited your store through our platform and completed this purchase. You can view all your VYA-attributed sales in your store dashboard.
 </p>

 <div style="margin:0 0 28px;">
 <a href="${dashboardUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:14px 36px;
 text-decoration:none;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Your Dashboard</a>
 </div>

 <p style="font-size:13px;color:rgba(93,15,23,0.5);line-height:1.6;margin:0;font-family:Georgia,'Times New Roman',serif;">
 Questions? Reply to this email or reach us at <a href="mailto:partnerships@vyaplatform.com" style="color:#5D0F17;">partnerships@vyaplatform.com</a>
 </p>
 `;

 const html = viaShell("Store Sale Notification", content);

 await resend.emails.send({
 from: "Hana @ VYA <hana@vyaplatform.com>",
 to: storeEmail,
 subject: `You made a sale through VYA — ${formattedTotal}`,
 html,
 });
}

export async function sendMonthlyReportEmail({
 monthLabel,
 newUsersCur, newUsersPrev, activeUsersCur, activeUsersPrev,
 clicksCur, clicksPrev,
 topCategories, topProducts, dayOfWeek,
}: {
 monthLabel: string;
 newUsersCur: number; newUsersPrev: number; activeUsersCur: number; activeUsersPrev: number;
 clicksCur: number; clicksPrev: number;
 topCategories: { category: string; clicks: number }[];
 topProducts: { product_name: string; store_slug: string; clicks: number; unique_users: number }[];
 dayOfWeek: { label: string; clicks: number; pct: number }[];
}): Promise<void> {
 const resend = getResend();
 const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
 const delta = (cur: number, prev: number) => prev === 0 ? null : ((cur - prev) / prev) * 100;
 const arrow = (d: number | null) => d === null ? "" : d >= 0
 ? `<span style="color:#059669;font-size:11px;font-weight:600;"> ▲ ${pct(d)}</span>`
 : `<span style="color:#dc2626;font-size:11px;font-weight:600;"> ▼ ${pct(Math.abs(d))}</span>`;

 const statCard = (label: string, value: string, trend: number | null) => `
 <td style="width:33%;padding:0 8px 0 0;vertical-align:top;">
 <div style="background:#FFFDF8;border:1px solid rgba(93,15,23,0.12);padding:18px 16px;">
 <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(93,15,23,0.5);margin-bottom:6px;font-family:Georgia,serif;">${label}</div>
 <div style="font-size:22px;font-weight:700;color:#5D0F17;font-family:Georgia,serif;">${value}</div>
 ${trend !== null ? `<div style="margin-top:4px;">${arrow(trend)}<span style="font-size:10px;color:rgba(93,15,23,0.4);margin-left:4px;">vs prior month</span></div>` : ""}
 </div>
 </td>
 `;

 const sectionHeader = (title: string) => `
 <div style="margin:36px 0 14px;border-bottom:1px solid rgba(93,15,23,0.15);padding-bottom:8px;">
 <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.2em;color:rgba(93,15,23,0.5);font-family:Georgia,serif;">${title}</span>
 </div>
 `;

 const maxCatClicks = Math.max(...topCategories.map((c) => c.clicks), 1);
 const maxProductClicks = Math.max(...topProducts.map((p) => p.clicks), 1);

 const categoryRows = topCategories.map((c) => `
 <tr>
 <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.07);font-size:13px;color:#5D0F17;font-family:Georgia,serif;text-transform:capitalize;">${c.category}</td>
 <td style="padding:8px 12px;border-bottom:1px solid rgba(93,15,23,0.07);vertical-align:middle;width:55%;">
 <div style="background:rgba(93,15,23,0.08);height:6px;border-radius:3px;">
 <div style="background:#5D0F17;height:6px;border-radius:3px;width:${Math.round((c.clicks / maxCatClicks) * 100)}%;"></div>
 </div>
 </td>
 <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.07);text-align:right;font-size:12px;color:rgba(93,15,23,0.6);font-family:Georgia,serif;">${c.clicks.toLocaleString()} clicks</td>
 </tr>
 `).join("");

 const productRows = topProducts.slice(0, 10).map((p, i) => `
 <tr>
 <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.07);font-size:11px;color:rgba(93,15,23,0.35);font-family:Georgia,serif;">${i + 1}</td>
 <td style="padding:8px 8px;border-bottom:1px solid rgba(93,15,23,0.07);font-size:13px;color:#5D0F17;font-family:Georgia,serif;">${p.product_name}</td>
 <td style="padding:8px 8px;border-bottom:1px solid rgba(93,15,23,0.07);font-size:11px;color:rgba(93,15,23,0.5);font-family:Georgia,serif;">${p.store_slug.replace(/-/g, " ")}</td>
 <td style="padding:8px 12px;border-bottom:1px solid rgba(93,15,23,0.07);vertical-align:middle;width:30%;">
 <div style="background:rgba(93,15,23,0.08);height:5px;border-radius:3px;">
 <div style="background:#5D0F17;height:5px;border-radius:3px;width:${Math.round((p.clicks / maxProductClicks) * 100)}%;"></div>
 </div>
 </td>
 <td style="padding:8px 0;border-bottom:1px solid rgba(93,15,23,0.07);text-align:right;font-size:11px;color:rgba(93,15,23,0.5);font-family:Georgia,serif;">${p.clicks} clicks</td>
 </tr>
 `).join("");

 const dowBars = dayOfWeek.map((d) => `
 <td style="text-align:center;padding:0 4px;vertical-align:bottom;">
 <div style="background:rgba(93,15,23,0.08);height:60px;display:flex;align-items:flex-end;">
 <div style="background:#5D0F17;width:100%;height:${d.pct}%;min-height:2px;"></div>
 </div>
 <div style="font-size:10px;color:rgba(93,15,23,0.5);margin-top:4px;font-family:Georgia,serif;">${d.label}</div>
 <div style="font-size:10px;color:#5D0F17;font-family:Georgia,serif;">${d.clicks.toLocaleString()}</div>
 </td>
 `).join("");

 const content = `
 <p style="font-size:15px;color:#5D0F17;line-height:1.7;margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;">
 Here's your platform summary for <strong>${monthLabel}</strong>.
 </p>
 <p style="font-size:13px;color:rgba(93,15,23,0.55);line-height:1.6;margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;">
 All figures cover ${monthLabel} vs the prior calendar month.
 </p>

 <!-- Top-line stats -->
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
 <tr>
 ${statCard("New Members", String(newUsersCur), delta(newUsersCur, newUsersPrev))}
 ${statCard("Active Members", String(activeUsersCur), delta(activeUsersCur, activeUsersPrev))}
 ${statCard("Total Clicks", clicksCur.toLocaleString(), delta(clicksCur, clicksPrev))}
 </tr>
 </table>

 ${sectionHeader("What Members Are Browsing — Top Categories")}
 ${topCategories.length === 0 ? `<p style="font-size:13px;color:rgba(93,15,23,0.4);font-family:Georgia,serif;">No click data this month.</p>` : `
 <table width="100%" cellpadding="0" cellspacing="0">
 <tbody>${categoryRows}</tbody>
 </table>`}

 ${sectionHeader("Most-Wanted Products — Top Clicked")}
 ${topProducts.length === 0 ? `<p style="font-size:13px;color:rgba(93,15,23,0.4);font-family:Georgia,serif;">No click data this month.</p>` : `
 <table width="100%" cellpadding="0" cellspacing="0">
 <thead>
 <tr>
 <th style="width:20px;"></th>
 <th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(93,15,23,0.4);padding-bottom:8px;font-family:Georgia,serif;font-weight:400;">Product</th>
 <th style="text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(93,15,23,0.4);padding-bottom:8px;font-family:Georgia,serif;font-weight:400;">Store</th>
 <th style="width:30%;"></th>
 <th style="text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(93,15,23,0.4);padding-bottom:8px;font-family:Georgia,serif;font-weight:400;">Clicks</th>
 </tr>
 </thead>
 <tbody>${productRows}</tbody>
 </table>`}

 ${dayOfWeek.length > 0 ? `
 ${sectionHeader("Click Activity by Day of Week")}
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
 <tr>${dowBars}</tr>
 </table>` : ""}

 <div style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(93,15,23,0.12);">
 <a href="https://vyaplatform.com/admin/analytics"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 32px;
 text-decoration:none;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Full Analytics →</a>
 </div>
 `;

 const html = viaShell(`${monthLabel} · Platform Report`, content);

 await resend.emails.send({
 from: "VYA Platform <hana@vyaplatform.com>",
 to: "hana@vyaplatform.com",
 subject: `VYA Monthly Report — ${monthLabel}`,
 html,
 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Win-back
// ─────────────────────────────────────────────────────────────────────────────

export async function sendWinbackEmail(
 email: string,
 tier: "14d" | "30d",
): Promise<void> {
 const resend = getResend();
 const shopUrl = withUtm(`${BASE_URL}/browse`, `winback_${tier}`);

 const headline =
 tier === "14d"
 ? "Something good is waiting for you."
 : "It's been a while. Come see what's new.";
 const body =
 tier === "14d"
 ? "You haven't been back in a bit — and new pieces have been coming in every day. Vintage moves fast. Don't miss it."
 : "A lot has changed since you last visited. New stores, new arrivals, pieces you won't find anywhere else.";

 const content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 ${headline}
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 32px;">
 ${body}
 </p>
 <a href="${shopUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">See What's New</a>
 `;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: tier === "14d" ? "We miss you" : "It's been a while",
 html: viaShell("For You", content),
 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Viewed item reminder
// ─────────────────────────────────────────────────────────────────────────────

export async function sendViewedItemReminderEmail(
 email: string,
 items: Array<{
 productTitle: string;
 productImage: string | null;
 storeName: string;
 productUrl: string;
 price: number;
 currency: string;
 }>,
): Promise<void> {
 const resend = getResend();

 let content: string;

 if (items.length === 1) {
 const { productTitle, productImage, storeName, productUrl, price, currency } = items[0];
 const imgBlock = productImage
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;margin:32px 0 24px;">
 <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="480"
 style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="height:28px;"></div>`;

 content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Still thinking about it?
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 4px;">
 You looked at this — and it&rsquo;s still here. But vintage is one of a kind.
 </p>
 ${imgBlock}
 <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 5px;">${storeName}</p>
 <a href="${productUrl}" style="text-decoration:none;">
 <p style="font-size:17px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.35;margin:0 0 8px;">${productTitle}</p>
 </a>
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 28px;">
 ${formatEmailPrice(price, currency)}
 </p>
 <a href="${productUrl}"
 style="display:inline-block;background:#5D0F17;color:#FFFDF8 !important;padding:13px 36px;
 text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 `;
 } else {
 const itemsHtml = items
 .map(({ productTitle, productImage, storeName, productUrl, price, currency }) => {
 const img = productImage
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;width:80px;flex-shrink:0;">
 <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="80"
 style="display:block;width:80px;height:80px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="width:80px;height:80px;background:#ede9e0;flex-shrink:0;"></div>`;
 return `
 <tr>
 <td style="padding:16px 0;border-bottom:1px solid rgba(93,15,23,0.08);">
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
 <tr>
 <td style="width:80px;vertical-align:top;">${img}</td>
 <td style="padding-left:16px;vertical-align:top;">
 <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 4px;">${storeName}</p>
 <a href="${productUrl}" style="text-decoration:none;">
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.3;margin:0 0 6px;">${productTitle}</p>
 </a>
 <p style="font-size:13px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 10px;">
 ${formatEmailPrice(price, currency)}
 </p>
 <a href="${productUrl}"
 style="display:inline-block;border:1px solid rgba(93,15,23,0.4);color:#5D0F17 !important;padding:6px 18px;
 text-decoration:none;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 </td>
 </tr>
 </table>
 </td>
 </tr>`;
 })
 .join("");

 content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 Still thinking about these?
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 24px;">
 You browsed these pieces recently — and they&rsquo;re still available. Each one is one of a kind.
 </p>
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
 ${itemsHtml}
 </table>
 `;
 }

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: "You left something behind",
 html: viaShell("Still Available", content),
 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Store digest
// ─────────────────────────────────────────────────────────────────────────────

export async function sendStoreDigestEmail(
 email: string,
 stores: Array<{
 store_slug: string;
 store_name: string;
 items: Array<{
 product_id: number;
 product_title: string;
 product_image: string | null;
 price: number;
 currency: string;
 store_slug: string;
 }>;
 }>,
 baseUrl: string,
): Promise<void> {
 const resend = getResend();

 const storesHtml = stores
 .map(({ store_slug, store_name, items }) => {
 const storeUrl = withUtm(`${baseUrl}/stores/${store_slug}`, "store_digest", store_slug);
 const itemsHtml = items
 .map(({ product_id, product_title, product_image, price, currency, store_slug: slug }) => {
 const productUrl = withUtm(`${baseUrl}/products/${slug}-${product_id}`, "store_digest", store_slug);
 const img = product_image
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;">
 <img src="${product_image}" alt="${product_title.replace(/"/g, "&quot;")}" width="120"
 style="display:block;width:120px;height:120px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="width:120px;height:120px;background:#ede9e0;"></div>`;
 return `
 <td style="width:120px;vertical-align:top;padding-right:12px;">
 ${img}
 <p style="font-size:12px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.3;margin:8px 0 4px;">${product_title}</p>
 <p style="font-size:12px;color:rgba(93,15,23,0.6);font-family:Georgia,'Times New Roman',serif;
 margin:0;">${formatEmailPrice(price, currency)}</p>
 </td>`;
 })
 .join("");

 return `
 <div style="margin-bottom:40px;">
 <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 4px;">New from</p>
 <a href="${storeUrl}" style="text-decoration:none;">
 <p style="font-size:18px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 font-weight:400;margin:0 0 16px;">${store_name}</p>
 </a>
 <table role="presentation" cellpadding="0" cellspacing="0">
 <tr>${itemsHtml}</tr>
 </table>
 <a href="${storeUrl}"
 style="display:inline-block;margin-top:14px;border-bottom:1px solid rgba(93,15,23,0.35);
 color:#5D0F17 !important;text-decoration:none;font-size:11px;letter-spacing:0.12em;
 text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;padding-bottom:2px;">
 Shop ${store_name} →
 </a>
 </div>`;
 })
 .join(`<div style="border-top:1px solid rgba(93,15,23,0.1);margin:8px 0 40px;"></div>`);

 const storeNames = stores.map((s) => s.store_name);
 const storeListCopy =
 storeNames.length === 1
 ? storeNames[0]
 : storeNames.length === 2
 ? `${storeNames[0]} and ${storeNames[1]}`
 : `${storeNames.slice(0, -1).join(", ")}, and ${storeNames[storeNames.length - 1]}`;

 const content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 New arrivals from stores you follow.
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 40px;">
 ${storeListCopy} added new pieces this week.
 </p>
 ${storesHtml}
 `;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: stores.length === 1 ? "Your favorite store just dropped new pieces" : "Your favorite stores just dropped new pieces",
 html: viaShell("New Arrivals", content),
 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Last chance
// ─────────────────────────────────────────────────────────────────────────────

export async function sendLastChanceEmail(
 email: string,
 items: Array<{
 productTitle: string;
 productImage: string | null;
 storeName: string;
 productUrl: string;
 price: number;
 currency: string;
 daysSaved: number;
 }>,
): Promise<void> {
 const resend = getResend();

 const itemsHtml = items
 .map(({ productTitle, productImage, storeName, productUrl, price, currency, daysSaved }) => {
 const weeksAgo = Math.round(daysSaved / 7);
 const timeLabel = weeksAgo <= 3 ? `${weeksAgo} week${weeksAgo !== 1 ? "s" : ""} ago` : `${Math.round(daysSaved / 30)} month${Math.round(daysSaved / 30) !== 1 ? "s" : ""} ago`;
 const img = productImage
 ? `<a href="${productUrl}" style="text-decoration:none;display:block;width:80px;flex-shrink:0;">
 <img src="${productImage}" alt="${productTitle.replace(/"/g, "&quot;")}" width="80"
 style="display:block;width:80px;height:80px;object-fit:cover;" border="0" />
 </a>`
 : `<div style="width:80px;height:80px;background:#ede9e0;flex-shrink:0;"></div>`;
 return `
 <tr>
 <td style="padding:16px 0;border-bottom:1px solid rgba(93,15,23,0.08);">
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
 <tr>
 <td style="width:80px;vertical-align:top;">${img}</td>
 <td style="padding-left:16px;vertical-align:top;">
 <p style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(93,15,23,0.5);
 font-family:Georgia,'Times New Roman',serif;margin:0 0 4px;">${storeName} &middot; Saved ${timeLabel}</p>
 <a href="${productUrl}" style="text-decoration:none;">
 <p style="font-size:14px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;
 line-height:1.3;margin:0 0 6px;">${productTitle}</p>
 </a>
 <p style="font-size:13px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;margin:0 0 10px;">
 ${formatEmailPrice(price, currency)}
 </p>
 <a href="${productUrl}"
 style="display:inline-block;border:1px solid rgba(93,15,23,0.4);color:#5D0F17 !important;padding:6px 18px;
 text-decoration:none;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;
 font-family:Georgia,'Times New Roman',serif;">View Item</a>
 </td>
 </tr>
 </table>
 </td>
 </tr>`;
 })
 .join("");

 const content = `
 <p style="font-size:15px;color:#5D0F17;font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 6px;">
 These are still waiting for you.
 </p>
 <p style="font-size:15px;color:rgba(93,15,23,0.65);font-family:Georgia,'Times New Roman',serif;line-height:1.75;margin:0 0 24px;">
 You saved ${items.length === 1 ? "this piece" : "these pieces"} a while back — and ${items.length === 1 ? "it&rsquo;s" : "they&rsquo;re"} still here.
 Vintage doesn&rsquo;t last forever. If you want it, now is the time.
 </p>
 <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
 ${itemsHtml}
 </table>
 `;

 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject: items.length === 1 ? "You saved this — it's still here" : "Your saved items are still here",
 html: viaShell("Still Here", content),
 });
}


// ============================================================================
// Insider Newsletter — curated email for highly-engaged members.
// ============================================================================

/**
 * Sends the insider newsletter to a list of emails using the rose-background
 * shell. The `contentHtml` is dropped directly into the body of the email
 * between the logo and the footer — it should be already-formatted HTML.
 *
 * Use the helper `getInsiderAudienceEmails()` to pull the audience.
 */
export async function sendInsiderNewsletterEmail(
 emails: string[],
 subject: string,
 contentHtml: string,
): Promise<{ sent: number; failed: number }> {
 if (emails.length === 0) return { sent: 0, failed: 0 };
 const resend = getResend();
 let sent = 0;
 let failed = 0;

 for (const email of emails) {
 const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
 const html = insiderShell(contentHtml, unsubUrl);
 try {
 await resend.emails.send({
 from: FROM_EMAIL,
 to: email,
 subject,
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
