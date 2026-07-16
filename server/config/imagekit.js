import ImageKit from '@imagekit/nodejs';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

/**
 * Uploads a buffer to ImageKit
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options (fileName, folder)
 * @returns {Promise<Object>} - Standardized upload result
 */
export const uploadBufferToImageKit = async (buffer, options = {}) => {
  try {
    const uploadOptions = {
      file: buffer,
      fileName: options.fileName || `file_${Date.now()}.jpg`,
      folder: options.folder || '/frams',
    };

    const result = await imagekit.upload(uploadOptions);
    
    return {
      url: result.url,
      publicId: result.fileId, // Mapped to publicId to remain compatible with Mongoose User/Student schemas
      width: result.width || 0,
      height: result.height || 0,
      format: result.format || 'jpg',
      bytes: result.size || 0,
    };
  } catch (error) {
    throw new Error(`ImageKit upload failed: ${error.message}`);
  }
};

/**
 * Deletes a file from ImageKit
 * @param {string} fileId - The file ID to delete
 * @returns {Promise<any>}
 */
export const deleteFromImageKit = async (fileId) => {
  try {
    if (!fileId) return null;
    const result = await imagekit.deleteFile(fileId);
    return result;
  } catch (error) {
    // Return null or throw depending on how tolerant the caller is
    console.error(`ImageKit deletion failed for file ${fileId}:`, error.message);
    return null;
  }
};

export { imagekit };
export default imagekit;
