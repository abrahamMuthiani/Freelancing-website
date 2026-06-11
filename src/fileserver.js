const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const mongoURI = 'mongodb://localhost:27017/innobridge_files';

let db;
let gridfsBucket;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Connect to MongoDB using MongoClient (for GridFSBucket)
MongoClient.connect(mongoURI).then(client => {
  db = client.db();
  gridfsBucket = new GridFSBucket(db, { bucketName: 'uploads' });
  console.log(' MongoDB connected via MongoClient');
  console.log(' GridFSBucket initialized');
}).catch(err => {
  console.error(' MongoDB connection error:', err);
});

// Multer - upload to temp folder
const upload = multer({ dest: 'temp/' });

/* ===================== ROUTES ===================== */

// Upload file to GridFS
app.post('/upload/project', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: ' No file uploaded' });
  }

  const readStream = fs.createReadStream(req.file.path);
  const uploadStream = gridfsBucket.openUploadStream(req.file.originalname);

  readStream.pipe(uploadStream)
    .on('error', (err) => {
      console.error(' Upload stream error:', err);
      return res.status(500).json({ success: false, message: ' Upload failed', error: err.message });
    })
    .on('finish', () => {
      fs.unlink(req.file.path, () => {}); // Clean temp file
      res.status(200).json({
        success: true,
        fileId: uploadStream.id,
        filename: uploadStream.filename,
        message: ' Project file uploaded successfully',
      });
    });
});

// Stream file by ID
app.get('/file/:id', (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const stream = gridfsBucket.openDownloadStream(fileId);
    stream.on('error', () => res.status(404).json({ error: 'File not found' }));
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: ' Error streaming file', details: err.message });
  }
});

// Get file metadata
app.get('/file/meta/:id', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const file = await db.collection('uploads.files').findOne({ _id: fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ error: ' Metadata fetch failed', details: err.message });
  }
});

// Optional fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(` Innobridge File Server running at http://localhost:${PORT}`);
});
