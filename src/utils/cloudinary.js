import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // console.log("File has been uploaded successfully on Cloudinary:", response.url);
        fs.unlinkSync(localFilePath); // Clean up the temp file on success
        return response;

    } catch (error) {
        // Log the detailed error from Cloudinary
        // console.error("CLOUDINARY UPLOAD FAILED. ERROR:", error);

        // Clean up the temp file on failure
        fs.unlinkSync(localFilePath);

        return null;
    }
}

export { uploadOnCloudinary };