const express = require('express');
const router = express.Router();

const adminRoutes = require('./adminRoutes');
const dropRoutes = require('./dropRoutes');
const voteRoutes = require('./voteRoutes');

// Connect sub-routers with prefixes
router.use('/admin', adminRoutes);
router.use('/drops', dropRoutes);
router.use('/votes', voteRoutes);

// Image Proxy to bypass KREAM's pstatic hotlink Referer blocks
router.get('/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://kream.co.kr/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch remote image');
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('[proxy-image] Proxy error:', err.message);
    res.status(500).send('Image proxy error');
  }
});

module.exports = router;
