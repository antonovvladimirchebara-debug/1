import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "posts");
const OUT_DIR = path.join(ROOT, "p");

const SITE_URL = "https://antonovvladimirchebara-debug.github.io/1";
const SITE_NAME = "1 Million Dollars";
const OWNER = "Vladimir Antonov";

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function readText(p) { return fs.readFileSync(p, "utf8"); }
function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function safeLink(url) {
  return /^(https?:\/\/|mailto:)/i.test(String(url).trim());
}

// Minimal safe markdown to HTML
function mdToSafeHtml(md) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = false;

  const inline = (s) => {
    let out = escapeHtml(s);
    out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
    out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    out = out.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const u = String(url).trim();
      if (!safeLink(u)) return escapeHtml(text);
      return `<a href="${escapeHtml(u)}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>`;
    });
    return out;
  };

  const closeList = () => {
    if (inList) { html += "</ul>"; inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }

    if (/^###\s+/.test(line)) { closeList(); html += `<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`; continue; }
    if (/^##\s+/.test(line))  { closeList(); html += `<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`; continue; }
    if (/^#\s+/.test(line))   { closeList(); html += `<h1>${inline(line.replace(/^#\s+/, ""))}</h1>`; continue; }

    if (/^-\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(line.replace(/^-+\s+/, ""))}</li>`;
      continue;
    }

    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  return html;
}

function parseFrontmatter(md) {
  const s = String(md);
  if (!s.startsWith("---")) return { meta: {}, body: s.trim() };
  const end = s.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: s.trim() };

  const fm = s.slice(3, end).trim();
  const body = s.slice(end + 4).trim();
  const meta = {};
  for (const line of fm.split("\n")) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    meta[m[1].trim()] = m[2].trim();
  }
  return { meta, body };
}

function htmlDoc({ title, description, canonical, bodyHtml, jsonLd }) {
  const cssHref = `${SITE_URL}/styles.css`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <meta name="theme-color" content="#0b1020"/>

  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <meta name="author" content="${escapeHtml(OWNER)}"/>
  <meta name="publisher" content="${escapeHtml(OWNER)}"/>

  <link rel="canonical" href="${escapeHtml(canonical)}"/>

  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:url" content="${escapeHtml(canonical)}"/>

  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${escapeHtml(title)}"/>
  <meta name="twitter:description" content="${escapeHtml(description)}"/>

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  <link rel="stylesheet" href="${cssHref}"/>
</head>
<body>
  <header class="header" id="top">
    <div class="container header__row">
      <a class="brand" href="${SITE_URL}/" aria-label="Home">
        <span class="brand__mark" aria-hidden="true"></span>
        <span class="brand__text">
          <span class="brand__title">${escapeHtml(SITE_NAME)}</span>
          <span class="brand__sub">News • Forecasts • Reviews • Notes</span>
        </span>
      </a>
      <nav class="nav" aria-label="Primary">
        <a class="nav__link" href="${SITE_URL}/#feed">Posts</a>
        <a class="nav__link" href="${SITE_URL}/#about">About</a>
        <a class="nav__link" href="${SITE_URL}/#contact">Contact</a>
      </nav>
    </div>
  </header>

  <main class="section">
    <div class="container">
      <article class="contactCard">
        ${bodyHtml}
        <div class="footer" style="margin-top:18px;">
          <span class="muted">© ${new Date().getFullYear()} ${escapeHtml(OWNER)}</span>
          <span class="muted"><a href="${SITE_URL}/#feed">Back to feed</a></span>
        </div>
      </article>
    </div>
  </main>
</body>
</html>`;
}

function buildSitemap(urls) {
  const entries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeHtml(u)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(`${SITE_URL}/`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${entries}
</urlset>
`;
}

function main() {
  const indexPath = path.join(POSTS_DIR, "index.json");
  if (!fs.existsSync(indexPath)) {
    console.error("posts/index.json not found");
    process.exit(1);
  }

  const data = readJson(indexPath);
  const posts = Array.isArray(data.posts) ? data.posts : [];

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const postUrls = [];

  for (const p of posts) {
    if (!p?.slug) continue;

    const slug = String(p.slug);
    const mdPath = path.join(POSTS_DIR, `${slug}.md`);
    if (!fs.existsSync(mdPath)) {
      console.warn(`Missing md: ${mdPath}`);
      continue;
    }

    const md = readText(mdPath);
    const { meta, body } = parseFrontmatter(md);

    const titleBase = p.title || meta.title || slug;
    const date = p.date || meta.date || "";
    const category = p.category || meta.category || "post";
    const summary = p.summary || meta.summary || "";
    const tags = Array.isArray(p.tags)
      ? p.tags
      : (meta.tags ? String(meta.tags).split(",").map(s => s.trim()).filter(Boolean) : []);

    const canonical = `${SITE_URL}/p/${encodeURIComponent(slug)}/`;

    const headBlock = `
      <div class="kicker">${escapeHtml(String(category))}${date ? " • " + escapeHtml(date) : ""}</div>
      <h1 class="h2" style="margin-top:8px;">${escapeHtml(titleBase)}</h1>
      ${summary ? `<p class="muted">${escapeHtml(summary)}</p>` : ""}
      ${tags.length ? `<div class="tags" style="margin-top:10px;">${tags.slice(0,10).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.10);margin:14px 0;">
    `;

    const bodyHtml = headBlock + `<div class="postBody">${mdToSafeHtml(body)}</div>`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: titleBase,
      datePublished: date || undefined,
      author: { "@type": "Person", name: OWNER },
      publisher: { "@type": "Organization", name: OWNER },
      mainEntityOfPage: canonical,
      url: canonical
    };

    const doc = htmlDoc({
      title: `${titleBase} — ${SITE_NAME}`,
      description: summary || `Post on ${SITE_NAME}`,
      canonical,
      bodyHtml,
      jsonLd
    });

    writeText(path.join(OUT_DIR, slug, "index.html"), doc);
    postUrls.push(canonical);
  }

  writeText(path.join(ROOT, "sitemap.xml"), buildSitemap(postUrls));
  console.log(`Generated ${postUrls.length} pages and sitemap.xml`);
}

main();
