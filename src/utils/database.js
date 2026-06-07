const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      if (!config.database.enabled) {
        logger.info('Database disabled in configuration');
        return;
      }

      logger.info('Connecting to database...');

      this.connection = await mongoose.connect(config.database.url, config.database.options);

      logger.info('✅ Database connected successfully');

      // Set up connection event handlers
      this.setupEventHandlers();

    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('error', (error) => {
      logger.error('Database connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected');
    });
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        logger.info('✅ Database disconnected successfully');
      }
    } catch (error) {
      logger.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!config.database.enabled) {
        return { status: 'disabled' };
      }

      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: states[state],
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = new Database();