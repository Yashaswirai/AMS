import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
dotenv.config();

const check = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/frams';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB via Mongoose');
    
    const user = await User.findOne({ email: 'admin@frams.edu' }).select('+password');
    console.log('User model findOne result:', user);
    if (user) {
      const isMatch = await user.comparePassword('Admin@123');
      console.log('Compare password via model method:', isMatch);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
};

check();
