import cloudinary from '../config/cloudinary.js';

// delete a file from cloudinary using its public ID
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
            try {
                        const result = await cloudinary.uploader.destroy(publicId, {
                                    resource_type: resourceType
                        });
                        return result;
            } catch (error) {
                        console.error('Cloudinary delete error:', error);
                        throw new Error('Could not delete file from cloudinary');
            }
};

// extract public ID from cloudinary URL
// needed when deleting old files
export const getPublicIdFromUrl = (url) => {
            // example url:
            // https://res.cloudinary.com/mycloud/image/upload/v123/lms/thumbnails/abc123.jpg
            // public id = lms/thumbnails/abc123
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            const nameWithoutExtension = filename.split('.')[0];
            const folder = parts[parts.length - 2];
            return `${folder}/${nameWithoutExtension}`;
};
