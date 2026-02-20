// /api/preview.js — Vercel Serverless Function
// Fetches a client's website and injects your widget before </body>
//
// Usage: https://your-domain.vercel.app/api/preview?site=https://clientsite.co.nz
//        Optional: &widget=shmakecut (defaults to shmakecut)
//        Optional: &after=.some-class  (CSS selector — inject widget after this element)

import { load } from 'cheerio';

const ALLOWED_WIDGETS = {
  shmakecut: {
    name: 'shmakeCut',
    embedKey: '26549d660df3b9b344a3af9bb6d4de44',
  },
};

export default async function handler(req, res) {
  const { site, widget = 'shmakecut', after } = req.query;

  // --- Validation ---
  if (!site) {
    return res.status(400).json({
      error: 'Missing ?site= parameter',
      usage: '/api/preview?site=https://example.co.nz&after=.some-class',
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(site);
  } catch {
    return res.status(400).json({ error: 'Invalid URL in ?site= parameter' });
  }

  const widgetConfig = ALLOWED_WIDGETS[widget];
  if (!widgetConfig) {
    return res.status(400).json({
      error: `Unknown widget: ${widget}`,
      available: Object.keys(ALLOWED_WIDGETS),
    });
  }

  // --- Fetch the target site ---
  try {
    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; shmake-preview/1.0; +https://shmake.co.nz)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Target site returned ${response.status}`,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({
        error: 'Target URL did not return HTML',
      });
    }

    let html = await response.text();

    // --- Rewrite relative URLs to absolute ---
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

    html = html.replace(
      /((?:href|src|action)\s*=\s*["'])\/((?!\/)[^"']*["'])/gi,
      `$1${baseUrl}/$2`
    );

    html = html.replace(
      /(url\(\s*["']?)\/((?!\/)[^)"']*)/gi,
      `$1${baseUrl}/$2`
    );

    // --- Use cheerio to manipulate the DOM ---
    const $ = load(html, { decodeEntities: false });

    // Add <base> tag
    const baseTag = `<base href="${baseUrl}/" target="_blank">`;
    if ($('head').length) {
      $('head').prepend(baseTag);
    }

    // --- Build the widget iframe injection ---
    const proxyOrigin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    const injection = `
<!-- shmake widget preview -->
<div id="shmake-widget-section" style="
  border-top: 3px solid #e67e22;
  background: #f8fafc;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="
        display: inline-block;
        background: linear-gradient(135deg, #e67e22, #d35400);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.03em;
        margin-bottom: 8px;
      ">WIDGET PREVIEW</span>
      <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">This is how shmakeCut would appear on your website</p>
    </div>
    <iframe
      id="shmake-widget-iframe"
      src="${proxyOrigin}/api/widget-frame?key=${widgetConfig.embedKey}"
      style="width: 100%; border: none; min-height: 700px; border-radius: 12px; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"
      allow="clipboard-write"
    ></iframe>
    <script>
      (function() {
        var iframe = document.getElementById('shmake-widget-iframe');
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'shmakecut-resize') {
            iframe.style.height = e.data.height + 'px';
          }
        });
        var interval = setInterval(function() {
          try {
            var h = iframe.contentDocument.body.scrollHeight;
            if (h > 100) { iframe.style.height = h + 'px'; }
          } catch(e) { clearInterval(interval); }
        }, 500);
        setTimeout(function() { clearInterval(interval); }, 15000);
      })();
    </script>
  </div>
</div>
<!-- /shmake widget preview -->
`;

    // --- Insert widget: after specific selector, or fall back to before </body> ---
    let placed = false;
    if (after) {
      const target = $(after);
      if (target.length) {
        target.first().after(injection);
        placed = true;
      }
    }
    if (!placed) {
      $('body').append(injection);
    }

    // --- Inject navigation blocker ---
    $('body').append(`
<script>
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.href && !link.href.startsWith('javascript:')) {
      e.preventDefault();
    }
  }, true);
</script>
`);

    // --- Inject top banner ---
    const banner = `
<div id="shmake-preview-banner" style="
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  padding: 10px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 20px rgba(0,0,0,0.2);
">
  <div>
    <strong>✂️ shmakeCut Preview</strong>
    <span style="opacity: 0.7; margin-left: 12px;">This is a preview of how the widget could look on your site</span>
  </div>
  <div style="display: flex; gap: 12px; align-items: center;">
    <a href="#shmake-widget-section" onclick="event.preventDefault();document.getElementById('shmake-widget-section').scrollIntoView({behavior:'smooth'})" style="
      color: white;
      background: #e67e22;
      padding: 6px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    ">See Widget ↓</a>
    <a href="https://shmake.co.nz/shmakecut" target="_blank" style="
      color: white;
      opacity: 0.7;
      text-decoration: none;
      font-size: 13px;
    ">Learn More</a>
    <span onclick="this.parentElement.parentElement.remove();document.body.style.paddingTop='0'" style="
      cursor: pointer;
      opacity: 0.5;
      font-size: 18px;
    ">✕</span>
  </div>
</div>
<style>
  body { padding-top: 48px !important; }
</style>
`;

    $('body').prepend(banner);

    // --- Serve ---
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.removeHeader('X-Frame-Options');
    return res.status(200).send($.html());
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to fetch target site',
      details: err.message,
    });
  }
}
