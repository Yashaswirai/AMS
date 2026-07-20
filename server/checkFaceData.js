import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';
import User from './models/User.js';
import FaceDataset from './models/FaceDataset.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({ name: /Yashaswi/i });
  console.log('Users matching Yashaswi:', users);

  for (const user of users) {
    const student = await Student.findOne({ user: user._id });
    console.log('Student for user:', student);
    if (student) {
      const ds = await FaceDataset.findOne({ student: student._id });
      console.log('FaceDataset for student:', ds);
    }
  }

  const allDs = await FaceDataset.find().lean();
  console.log('Total FaceDatasets in DB:', allDs.length);
  allDs.forEach(d => {
    console.log(`Student ID ${d.student}: ${d.imagePaths?.length} images`);
    if (d.imagePaths?.length > 0) {
      console.log('First image URL:', d.imagePaths[0].url);
    }
  });

  await mongoose.disconnect();
}

check().catch(console.error);
