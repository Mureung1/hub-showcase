const cron = require('node-cron');
const { scrapeKreamSneakers } = require('../crawler/kreamCrawler');

/**
 * Initializes cron jobs for KREAM synchronization
 * Runs every Friday at 09:00 AM (Korea Standard Time)
 * Cron expression: '0 9 * * 5'
 */
function initCrawlerCron() {
  console.log('[cron] KREAM sync scheduler initialized.');
  
  // Every Friday at 09:00 (Asia/Seoul timezone)
  cron.schedule('0 9 * * 5', async () => {
    console.log('[cron] Running scheduled weekly KREAM sync...');
    try {
      await scrapeKreamSneakers();
      console.log('[cron] Scheduled weekly KREAM sync completed successfully.');
    } catch (error) {
      console.error('[cron] Scheduled weekly KREAM sync failed:', error);
    }
  }, {
    timezone: 'Asia/Seoul'
  });
}

module.exports = {
  initCrawlerCron
};
