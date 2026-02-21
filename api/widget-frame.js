// /api/widget-frame.js — Serves the widget in a clean, isolated HTML page
// Used as the src for an iframe in the preview proxy
//
// Usage: /api/widget-frame?key=EMBED_KEY

export default function handler(req, res) {
  const { key = '26549d660df3b9b344a3af9bb6d4de44' } = req.query;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>shmakeCut Widget</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="shmakecut" data-key="${key}"></div>
  <script src="https://demo.shmake.nz/shmakecut.iife.js"></script>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'shmakecut-fullscreen') {
        window.parent.postMessage(e.data, '*');
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
}
