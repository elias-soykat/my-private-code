const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const freeShippingStickerQueue = require('../bullQueue/freeShippingStickerQueue');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(freeShippingStickerQueue)],
  serverAdapter: serverAdapter
});

module.exports = () => {
  const app = express();

  app.use(compression()); // Gzip compression for improved performance
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cors());
  app.use(express.static(path.join(__dirname, '../public')));

  // admin/queues is helpful for monitoring the queues on the development
  if (process.env.NODE_ENV === 'dev' && serverAdapter) {
    app.use('/admin/queues', serverAdapter.getRouter());
  }

  return app;
};
