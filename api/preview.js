// /api/preview.js — Vercel Serverless Function
// Fetches a client's website and injects your widget before </body>
//
// Usage: https://your-domain.vercel.app/api/preview?site=https://clientsite.co.nz
//        Optional: &widget=shmakecut (defaults to shmakecut)
//        Optional: &after=.some-class  (CSS selector — inject widget after this element)
//        Optional: &key=EMBED_KEY      (tenant embed key for theming — defaults to demo key)
//        Optional: &mode=sidebar       (sidebar overlay — works with Wix, Squarespace, etc.)

import { load } from 'cheerio';

const ALLOWED_WIDGETS = {
  shmakecut: {
    name: 'shmakeCut',
    embedKey: '26549d660df3b9b344a3af9bb6d4de44',
  },
};

export default async function handler(req, res) {
  const { site, widget = 'shmakecut', after, key, mode } = req.query;

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

  // --- Sidebar mode: two iframes side by side, no proxy needed ---
  if (mode === 'sidebar') {
    const proxyOrigin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const embedKey = key || widgetConfig.embedKey;

    const sidebarHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>shmakeCut Preview — ${targetUrl.host}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    #banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: white; padding: 10px 20px; font-size: 14px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 20px rgba(0,0,0,0.2);
    }
    #banner a { color: white; text-decoration: none; }
    #layout {
      position: fixed; top: 48px; left: 0; right: 0; bottom: 0;
      display: flex;
    }
    #site-frame {
      flex: 1; border: none; height: 100%;
    }
    #widget-panel {
      width: 520px; min-width: 420px; height: 100%;
      border-left: 3px solid #e67e22;
      display: flex; flex-direction: column; background: #f8fafc;
    }
    #widget-panel .panel-header {
      padding: 16px 20px; text-align: center; background: #f8fafc;
      border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
    }
    #widget-panel .panel-header .badge {
      display: inline-block; background: linear-gradient(135deg, #e67e22, #d35400);
      color: white; padding: 4px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 600; letter-spacing: 0.03em;
    }
    #widget-panel .panel-header p {
      color: #64748b; font-size: 13px; margin-top: 4px;
    }
    #widget-frame {
      flex: 1; border: none; width: 100%;
    }
    #resize-handle {
      width: 6px; cursor: col-resize; background: transparent;
      position: relative; flex-shrink: 0;
    }
    #resize-handle:hover, #resize-handle.active { background: #e67e22; }
    @media (max-width: 900px) {
      #layout { flex-direction: column; }
      #widget-panel { width: 100%; min-width: unset; height: 50%; border-left: none; border-top: 3px solid #e67e22; }
      #resize-handle { display: none; }
    }
  </style>
</head>
<body>
  <div id="banner">
    <div>
      <strong>✂️ shmakeCut Preview</strong>
      <span style="opacity:0.7;margin-left:12px;">${targetUrl.host}</span>
    </div>
    <div style="display:flex;gap:12px;align-items:center;">
      <a href="https://shmake.co.nz/shmakecut" target="_blank" style="opacity:0.7;font-size:13px;">Learn More</a>
    </div>
  </div>
  <div id="layout">
    <iframe id="site-frame" src="${targetUrl.href}"></iframe>
    <div id="resize-handle"></div>
    <div id="widget-panel">
      <div class="panel-header">
        <span class="badge">WIDGET PREVIEW</span>
        <p>This is how shmakeCut would appear on your website</p>
      </div>
      <iframe id="widget-frame" src="${proxyOrigin}/api/widget-frame?key=${embedKey}"></iframe>
    </div>
  </div>
  <script>
    // Draggable resize handle
    (function() {
      var handle = document.getElementById('resize-handle');
      var panel = document.getElementById('widget-panel');
      var dragging = false;
      handle.addEventListener('mousedown', function(e) {
        dragging = true;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        // Overlay iframes so mouse events aren't swallowed
        document.querySelectorAll('iframe').forEach(function(f) { f.style.pointerEvents = 'none'; });
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        var newWidth = window.innerWidth - e.clientX;
        if (newWidth < 320) newWidth = 320;
        if (newWidth > window.innerWidth - 200) newWidth = window.innerWidth - 200;
        panel.style.width = newWidth + 'px';
      });
      document.addEventListener('mouseup', function() {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.querySelectorAll('iframe').forEach(function(f) { f.style.pointerEvents = ''; });
      });
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(sidebarHtml);
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
      src="${proxyOrigin}/api/widget-frame?key=${key || widgetConfig.embedKey}"
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
