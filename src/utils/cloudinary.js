import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs"

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //console.log("file is uploaded on cloudinary ", res.url);
        fs.unlinkSync(localFilePath)
        return res;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log(error);
        return null;
    }
}

const deleteFromCloudinary = async (publicUrlOrId, resourceType = "image") => {
    try {
        if (!publicUrlOrId) return null
        
        let publicId = publicUrlOrId
        if (publicUrlOrId.includes("res.cloudinary.com")) {
            const parts = publicUrlOrId.split("/")
            const fileName = parts[parts.length - 1]
            publicId = fileName.split(".")[0]
        }

        const res = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        })
        return res
    } catch (error) {
        console.log("Error deleting from cloudinary:", error)
        return null
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }