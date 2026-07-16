import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/frams';

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    heartbeatFrequencyMS: 10000,
  };

  try {
    const conn = await mongoose.connect(mongoURI, options);
    retryCount = 0;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
      scheduleReconnect();
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
      retryCount = 0;
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB();
    } else {
      console.error('❌ Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

const scheduleReconnect = () => {
  if (retryCount < MAX_RETRIES) {
    setTimeout(async () => {
      retryCount++;
      try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/frams');
      } catch (err) {
        console.error('❌ Reconnection attempt failed:', err.message);
        scheduleReconnect();
      }
    }, RETRY_DELAY_MS);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

export default connectDB;
