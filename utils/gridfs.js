const mongoose = require('mongoose');
const { Readable } = require('stream');

let gridfsBucket;

const initializeGridFS = async () => {
    if (!mongoose.connection.db) {
        throw new Error('Mongoose connection not established');
    }
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
    });
};

const uploadFileToGridFS = (file, filename) => {
    return new Promise((resolve, reject) => {
        if (!gridfsBucket) {
            return reject(new Error('GridFS not initialized'));
        }
        const uploadStream = gridfsBucket.openUploadStream(filename, {
            contentType: file.mimetype || 'application/octet-stream',
        });
        const readable = Readable.from(file.buffer);
        readable.pipe(uploadStream);

        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });

        uploadStream.on('error', (error) => {
            console.error(`Upload error for file ${filename}:`, error);
            reject(error);
        });
    });
};

const downloadFileFromGridFS = async (fileId, res) => {
    try {
        if (!gridfsBucket) {
            return res.status(500).json({ message: 'GridFS not initialized' });
        }
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({ message: 'Invalid file ID' });
        }
        const file = await mongoose.connection.db.collection('uploads.files').findOne({
            _id: new mongoose.Types.ObjectId(fileId),
        });
        if (!file) {
            return res.status(404).json({ message: 'File not found in GridFS' });
        }
        res.set('Content-Type', file.contentType || 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
        // Add cache headers for 1 day
        res.set('Cache-Control', 'public, max-age=86400, immutable');
        gridfsBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId)).pipe(res);
    } catch (error) {
        console.error(`Download error for file ${fileId}:`, error);
        res.status(500).json({ message: 'Failed to download file', error: error.message });
    }
};

const deleteFileFromGridFS = async (fileId) => {
    if (!gridfsBucket) {
        throw new Error('GridFS not initialized');
    }
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        throw new Error('Invalid file ID');
    }
    await gridfsBucket.delete(new mongoose.Types.ObjectId(fileId));
};

module.exports = {
    initializeGridFS,
    uploadFileToGridFS,
    downloadFileFromGridFS,
    deleteFileFromGridFS,
};
