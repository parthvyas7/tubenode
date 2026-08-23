import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIRespone.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getAllVideos = asyncHandler(async (req, res) => {
    // TODO: get all videos
    return res.status(200).json(new APIResponse(200, [], "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: publish a video
    return res.status(200).json(new APIResponse(200, {}, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    // TODO: get video by id
    return res.status(200).json(new APIResponse(200, {}, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    // TODO: update video
    return res.status(200).json(new APIResponse(200, {}, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    // TODO: delete video
    return res.status(200).json(new APIResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    // TODO: toggle publish status
    return res.status(200).json(new APIResponse(200, {}, "Publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
