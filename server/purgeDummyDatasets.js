import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';
import FaceDataset from './models/FaceDataset.js';

dotenv.config();

async function purgeDummyDatasets() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const datasets = await FaceDataset.find();
  let purgedCount = 0;

  for (const ds of datasets) {
    const hasDummy = ds.imagePaths?.some(img => 
      img.url?.includes('unsplash.com') || img.url?.includes('ik.imagekit.io/dummy')
    );

    if (hasDummy) {
      console.log(`Purging dummy dataset for Student ID: ${ds.student}`);
      await FaceDataset.findByIdAndDelete(ds._id);
      
      // Update student record
      await Student.findByIdAndUpdate(ds.student, {
        faceRegistered: false,
        faceDatasetPath: '',
        faceEmbeddings: []
      });
      purgedCount++;
    }
  }

  console.log(`Purged ${purgedCount} dummy dataset records from MongoDB.`);
  await mongoose.disconnect();
}

purgeDummyDatasets().catch(console.error);
