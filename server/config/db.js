// config/db.js — MongoDB connection via Mongoose.
import mongoose from 'mongoose';



/**
 * Connects to MongoDB.
 *
 * The connection failure is logged but NOT fatal in development, so the API
 * (and its health check) can still run while you set up Mongo. In production
 * you may prefer to exit the process on failure — see the note below.
 */
export default async function connectDB() {
  const uri = process.env.MONGO_URI ;

  // Fail fast instead of buffering queries forever when the DB is unreachable.
  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed — the API will still start.');
    console.warn(`   Reason: ${err.message}`);
    console.warn('   Set MONGO_URI in server/.env and ensure MongoDB is running.');
    // In production, uncomment to make a DB outage fatal:
    // process.exit(1);
    return null;
  }
}

// Helpful connection lifecycle logs during development.
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected.');
});
