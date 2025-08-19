// worker/freeShippingStickerWorker.js
const freeShippingStickerQueue = require('../bullQueue/freeShippingStickerQueue');
const logger = require('../logger/winston');
const freeShippingService = require('../services/shipping/freeShipping.service');

async function initializeFreeShippingStickerWorker() {
  freeShippingStickerQueue.process(async (job) => {
    const { freeShippingId, productIds, action, startDate, endDate } = job.data;

    if (action === 'enable') {
      await freeShippingService.enableFreeShippingByScheduleRepository(freeShippingId, productIds, startDate, endDate);
    } else if (action === 'disable') {
      await freeShippingService.disableFreeShippingByScheduleRepository(freeShippingId, productIds, startDate, endDate);
    } else {
      throw new Error('Invalid action provided');
    }
  });

  // Log lifecycle
  freeShippingStickerQueue.on('waiting', (jobId) => logger.info(`📥 Job waiting: ${jobId}`));
  freeShippingStickerQueue.on('active', (job) => logger.info(`⚙️ Job active: ${job.id}`));
  freeShippingStickerQueue.on('completed', (job) => logger.info(`✅ Job completed: ${job.id}`));
  freeShippingStickerQueue.on('failed', (job, err) => logger.error(`❌ Job failed: ${job?.id}`, err));
}

module.exports = initializeFreeShippingStickerWorker;
