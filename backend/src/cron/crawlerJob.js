const cron = require('node-cron');
const { scrapeKreamSneakers, scrapeKreamUpcoming } = require('../crawler/kreamCrawler');

/**
 * Initializes cron jobs for KREAM synchronization
 * Runs every hour
 * Cron expression: '0 * * * *'
 */
function initCrawlerCron() {
  console.log('[cron] KREAM sync scheduler initialized (Every Hour).');
  
  // Every Hour (Asia/Seoul timezone)
  cron.schedule('0 * * * *', async () => {
    console.log('[cron] Running scheduled hourly KREAM sync...');
    try {
      await scrapeKreamSneakers();
      try {
        await scrapeKreamUpcoming();
      } catch (err) {
        console.error('[cron] Scheduled upcoming sync failed:', err.message);
      }
      console.log('[cron] Scheduled hourly KREAM sync completed successfully.');
    } catch (error) {
      console.error('[cron] Scheduled hourly KREAM sync failed:', error);
    }
  }, {
    timezone: 'Asia/Seoul'
  });
}

module.exports = {
  initCrawlerCron
};
