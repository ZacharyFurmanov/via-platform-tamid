/**
 * June 2026 Insider Newsletter — drop-in HTML for the insider rose-background shell.
 * Pass `JUNE_2026_NEWSLETTER_HTML` as `contentHtml` to /api/admin/send-insider-newsletter.
 *
 * Product links use search URLs by default (vyaplatform.com/search?q=...) so they
 * always resolve. Swap in exact product URLs by editing the `href` on each card.
 */

const TEXT = "#5D0F17";
const TEXT_MUTED = "rgba(93,15,23,0.7)";
const ACCENT_BG = "rgba(93,15,23,0.08)"; // subtle box on rose
const BTN_BG = "#5D0F17";
const BTN_TEXT = "#FFFDF8";
const SERIF = "Georgia, 'Times New Roman', serif";

function h2(text: string): string {
  return `<h2 style="font-family:${SERIF};font-size:24px;color:${TEXT};margin:0 0 14px;font-weight:normal;line-height:1.3;">${text}</h2>`;
}

function h3(text: string): string {
  return `<h3 style="font-family:${SERIF};font-size:18px;color:${TEXT};margin:24px 0 8px;font-weight:600;line-height:1.3;">${text}</h3>`;
}

function eyebrow(text: string): string {
  return `<p style="font-family:${SERIF};font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:${TEXT};margin:0 0 8px;">${text}</p>`;
}

function para(text: string): string {
  return `<p style="font-family:${SERIF};font-size:14px;color:${TEXT};line-height:1.7;margin:0 0 14px;">${text}</p>`;
}

function divider(): string {
  return `<div style="border-top:1px solid rgba(93,15,23,0.25);margin:40px 0;"></div>`;
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BTN_BG};color:${BTN_TEXT} !important;padding:12px 28px;text-decoration:none;font-family:${SERIF};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">${label}</a>`;
}

/**
 * Product card — text/CTA only (no image; placeholder for now).
 * Once you have exact product URLs, drop them into `href`.
 */
function productCard(args: { title: string; store: string; href: string; note?: string }): string {
  return `
    <div style="background:${ACCENT_BG};padding:20px 22px;margin:0 0 14px;">
      <p style="font-family:${SERIF};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${TEXT};margin:0 0 6px;">${args.store}</p>
      <p style="font-family:${SERIF};font-size:15px;color:${TEXT};margin:0 0 12px;line-height:1.4;">${args.title}</p>
      ${args.note ? `<p style="font-family:${SERIF};font-size:12px;color:${TEXT_MUTED};margin:0 0 12px;font-style:italic;">${args.note}</p>` : ""}
      <a href="${args.href}" style="display:inline-block;border:1px solid ${TEXT};color:${TEXT} !important;padding:8px 18px;text-decoration:none;font-family:${SERIF};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;">Shop Now</a>
    </div>
  `;
}

/**
 * Event card — for upcoming markets / happenings.
 */
function eventCard(args: { name: string; bullets: string[]; date?: string }): string {
  const bulletHtml = args.bullets
    .map((b) => `<li style="font-family:${SERIF};font-size:13px;color:${TEXT};line-height:1.6;margin:0 0 6px;">${b}</li>`)
    .join("");
  return `
    <div style="margin:0 0 24px;">
      <p style="font-family:${SERIF};font-size:16px;color:${TEXT};margin:0 0 4px;font-weight:600;">${args.name}</p>
      ${args.date ? `<p style="font-family:${SERIF};font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:${TEXT};margin:0 0 10px;">${args.date}</p>` : ""}
      <ul style="margin:6px 0 0;padding-left:20px;">${bulletHtml}</ul>
    </div>
  `;
}

const PRODUCT = (compositeId: string) => `https://vyaplatform.com/products/${compositeId}`;

export const JUNE_2026_NEWSLETTER_SUBJECT = "VYA — The Vintage Fashion Guide for VYA Insiders · June";

export const JUNE_2026_NEWSLETTER_HTML = `
  ${para(`Welcome to the first VYA Insider Newsletter. We built this for the people who actually use the platform — the buyers, the regulars, the people inviting friends. This is your monthly drop of what we're loving, who we're featuring, and what's coming next.`)}

  ${divider()}

  ${eyebrow("Hana's Top Picks")}
  ${h2("VYA Founder's Edit")}
  ${para("My three favorite finds on the platform this month — each from a different store, each unmistakably summer.")}

  ${productCard({
    title: "Dolce &amp; Gabbana Strappy Sandals",
    store: "Vintage Archives LA",
    href: PRODUCT("vintage-archives-la-241"),
  })}

  ${productCard({
    title: "Gucci Red Leather Peplum Jacket &mdash; Frida Giannini Era",
    store: "Edited Archive",
    href: PRODUCT("edited-archive-1225604"),
  })}

  ${productCard({
    title: "Chlo&eacute; Paddington Red Bag",
    store: "Porter's Preloved",
    href: PRODUCT("porters-preloved-1247886"),
  })}

  ${divider()}

  ${eyebrow("This Month In Vintage")}
  ${h2("Upcoming Happenings")}

  ${eventCard({
    name: "The Boston Open Market",
    date: "Every Saturday · May–October",
    bullets: [
      "Vibrant open-air market featuring 50 local artists and small businesses",
      "Boylston Street entrance to the Boston Public Garden",
      "Stunning jewelry, fashion accessories, pottery, and one-of-a-kind home decor",
    ],
  })}

  ${eventCard({
    name: "Fredrick VNTG Fest (DC)",
    date: "June 20 · 11am–5pm",
    bullets: [
      "Shop 120+ curated vendors across 3 buildings and 20,000 sqft",
      "Y2K / 90s clothing, jewelry, music, home decor, local art, tattoos &amp; more",
    ],
  })}

  ${eventCard({
    name: "NY Archive — Open Now",
    bullets: [
      "Every piece is sold by one of their vendors",
      "Space for regular shopping appointments, stylist pulls, creative shoots, and community events",
      "Rotating vendors every 3 months across 15 iconic brands",
    ],
  })}

  ${divider()}

  ${eyebrow("What's Coming")}
  ${h2("Trends We're Watching")}

  ${h3("ETRO summer instead of Pucci summer?")}
  ${para("The print obsession is shifting. We're already seeing demand pivot toward ETRO's painterly motifs over Pucci's psychedelic geometry.")}
  ${productCard({
    title: "ETRO Printed Skirt",
    store: "Sourced by Scottie",
    href: PRODUCT("sourced-by-scottie-1734674"),
  })}
  ${productCard({
    title: "ETRO Shoes",
    store: "The Objects of Affection",
    href: PRODUCT("the-objects-of-affection-176848"),
  })}

  ${h3("Less leopard, more color")}
  ${para("Vibrant solids and bold mono-tones are pulling ahead of animal prints for the first time in two seasons.")}
  ${productCard({
    title: "A color-forward piece worth knowing",
    store: "Situations Vintage",
    href: PRODUCT("situations-vintage-1736931"),
  })}

  ${h3("The Dior Malice bag")}
  ${para("Get one now &mdash; prices are climbing fast.")}
  ${productCard({
    title: "Dior Malice Bag",
    store: "Petria Vintage",
    href: PRODUCT("petria-vintage-102595"),
  })}

  <div style="text-align:center;margin:24px 0 12px;">
    ${ctaButton("Browse New Arrivals", "https://vyaplatform.com/new-arrivals")}
  </div>

  ${divider()}

  ${eyebrow("Designer of the Month")}
  ${h2("Phoebe Philo")}

  ${para("There are designers who follow culture, and then there are those who quietly rewire it. Phoebe Philo belongs to the latter. The nature of her influence is difficult to quantify, but it&rsquo;s something far more enduring and long-lasting. Philo essentially founded minimalism in fashion before it was rebranded as &ldquo;quiet luxury.&rdquo;")}

  ${para("Born in Paris but raised in London, that duality placed her between two of fashion&rsquo;s most influential capitals and ultimately led her to Central Saint Martins. After graduating, she joined Stella McCartney at Chlo&eacute;, where she refined her vision for practical femininity. It wasn&rsquo;t long before she took the helm as creative director, boosting Chlo&eacute;&rsquo;s sales by over 60% in under five years.")}

  ${para("It was at C&eacute;line, beginning in 2008, that her vision fully materialized. Philo had a tenacious rejection of overt sexuality &mdash; what we now call &ldquo;the male gaze&rdquo; &mdash; and instead offered structured, functional alternatives. Oversized silhouettes, sophisticated tailoring, restrained neutral palettes. These were clothes that assumed a woman&rsquo;s interior life was rich, complex, and worthy of consideration.")}

  ${para("The &ldquo;Philo woman&rdquo; became industry shorthand, though never easily defined. Independent, self-possessed, dressing only for herself. When she stepped down in 2018, her influence threaded through The Row, Toteme, Matthieu Blazy at Chanel, Michael Rider at C&eacute;line, Peter Do at Helmut Lang. In 2021 she returned with her self-titled label &mdash; a continuation of her legacy.")}

  ${para("To Philo, minimalism was a philosophy rooted in respect, not an aesthetic or a trend. She didn&rsquo;t just design clothes &mdash; she redefined the relationship between a woman and her wardrobe.")}

  ${para(`<em>&ldquo;A woman should never be a mannequin for clothes. She should bring her own personality to them.&rdquo;</em>`)}

  <div style="text-align:center;margin:24px 0 12px;">
    ${ctaButton("Read The Full Article", "https://vyaplatform.substack.com/p/icons-in-fashion-phoebe-philo")}
  </div>

  ${divider()}

  ${eyebrow("Stylist Spotlight")}
  ${h2("Natalie Granader's Summer Edit")}

  ${para(`<em>&ldquo;Summer dressing is all about finding standout pieces that can inspire an entire outfit. This month I pulled some of my favorite finds from VYA and styled them for some of my favorite summer occasions.&rdquo;</em>`)}

  ${h3("For Dinner")}
  ${para(`&ldquo;I'd pair these colorful statement accessories with an airy white top and vintage Levi's for an elevated summer dinner look. The Fendi baguette and vintage Dolce &amp; Gabbana heels do all the work &mdash; sometimes the best outfits start with incredible accessories.&rdquo;`)}
  ${productCard({
    title: "Dolce &amp; Gabbana Strappy Heels",
    store: "Vintage Archives LA",
    href: PRODUCT("vintage-archives-la-241"),
  })}
  ${productCard({
    title: "Fendi Baguette",
    store: "Porter's Preloved",
    href: PRODUCT("porters-preloved-889840"),
  })}

  ${h3("For Brunch")}
  ${para(`&ldquo;I'd style these statement floral jeans with a simple white tank, satin mules, a mini shoulder bag, and a chunky gold bangle. The look feels effortless but cool &mdash; perfect for a summer brunch.&rdquo;`)}
  ${productCard({
    title: "Cavalli Floral Jeans",
    store: "Bloda's Choice",
    href: PRODUCT("blodas-choice-23622"),
  })}
  ${productCard({
    title: "Vintage Gold Metal Bangle",
    store: "Dayton Jane",
    href: PRODUCT("dayton-jane-54691"),
  })}

  ${h3("For a European Beach Day")}
  ${para(`&ldquo;This vintage mini skirt was made for a European summer. I'd style it with a bright bikini, jelly flip-flops, retro-inspired sunglasses, and a crochet beach bag for a look that takes you from the beach club straight to lunch by the water.&rdquo;`)}
  ${productCard({
    title: "D&amp;G Vintage Tropical Mini Skirt",
    store: "Club Fleur Vintage",
    href: PRODUCT("club-fleur-46675"),
  })}

  ${para(`<em>&ldquo;My favorite outfits always start with a statement piece. Whether it's a vintage Fendi baguette or a pair of Dolce &amp; Gabbana heels, the best vintage finds don't just complete an outfit &mdash; they inspire it.&rdquo;</em>`)}

  ${divider()}

  ${eyebrow("Customer Spotlight")}
  ${h2("Where Should We Pop Up Next?")}
  ${para("We want to bring VYA into your city. DM us where you want to see our next community event.")}

  <div style="text-align:center;margin:24px 0 8px;">
    ${ctaButton("DM @vyaplatform", "https://www.instagram.com/vyaplatform")}
  </div>
`;
