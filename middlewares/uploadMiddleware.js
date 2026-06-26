import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// ---- COURSE THUMBNAIL ----
export const thumbnailStorage = new CloudinaryStorage({
            cloudinary,
            params: {
                        folder: 'lms/thumbnails',       // folder in cloudinary
                        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                        transformation: [
                                    { width: 1280, height: 720, crop: 'fill' }  // resize to 16:9
                        ]
            }
});

// ---- LESSON VIDEOS ----
export const videoStorage = new CloudinaryStorage({
            cloudinary,
            params: {
                        folder: 'lms/videos',
                        allowed_formats: ['mp4', 'mov', 'avi', 'mkv'],
                        resource_type: 'video'          // must specify video for cloudinary
            }
});

// ---- LESSON RESOURCES (PDF, DOC, PPT, XLS, ZIP) ----
export const resourceStorage = new CloudinaryStorage({
            cloudinary,
            params: (req, file) => {
                        // dynamically set folder based on file type
                        let folder = 'lms/resources';
                        let resourceType = 'raw'; // raw for documents

                        if (file.mimetype.startsWith('image/')) {
                                    folder = 'lms/images';
                                    resourceType = 'image';
                        }

                        return {
                                    folder,
                                    resource_type: resourceType,
                                    allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip']
                        };
            }
});

// ---- USER AVATAR ----
export const avatarStorage = new CloudinaryStorage({
            cloudinary,
            params: {
                        folder: 'lms/avatars',
                        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                        transformation: [
                                    { width: 300, height: 300, crop: 'fill', gravity: 'face' } // square crop on face
                        ]
            }
});

// ---- FILE SIZE LIMITS ----
export const thumbnailUpload = multer({
            storage: thumbnailStorage,
            limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max for thumbnails
});

export const videoUpload = multer({
            storage: videoStorage,
            limits: { fileSize: 500 * 1024 * 1024 } // 500MB max for videos
});

export const resourceUpload = multer({
            storage: resourceStorage,
            limits: { fileSize: 50 * 1024 * 1024 }  // 50MB max for documents
});

export const avatarUpload = multer({
            storage: avatarStorage,
            limits: { fileSize: 2 * 1024 * 1024 }   // 2MB max for avatars
});

