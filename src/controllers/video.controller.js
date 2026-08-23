import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query

    const matchConditions = {}

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new APIError(400, "Invalid userId")
        }
        matchConditions.owner = new mongoose.Types.ObjectId(String(userId))
    }

    if (query) {
        matchConditions.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    // If fetching videos of a specific user who is NOT the requester, only show published videos
    if (!userId || (req.user?._id && req.user._id.toString() !== userId.toString())) {
        matchConditions.isPublished = true
    }

    const sortOptions = {}
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1

    const videoAggregate = Video.aggregate([
        {
            $match: matchConditions
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: sortOptions
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videos = await Video.aggregatePaginate(videoAggregate, options)

    return res
        .status(200)
        .json(new APIResponse(200, videos, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title || !description || title.trim() === "" || description.trim() === "") {
        throw new APIError(400, "Title and description are required")
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoFileLocalPath) {
        throw new APIError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new APIError(400, "Thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile?.url) {
        throw new APIError(500, "Failed to upload video file on Cloudinary")
    }

    if (!thumbnail?.url) {
        throw new APIError(500, "Failed to upload thumbnail on Cloudinary")
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration || 0,
        owner: req.user._id,
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id)

    if (!createdVideo) {
        throw new APIError(500, "Failed to publish video")
    }

    return res
        .status(201)
        .json(new APIResponse(201, createdVideo, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video ID")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(videoId))
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ])

    if (!video?.length) {
        throw new APIError(404, "Video not found")
    }

    // Increment views
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    return res
        .status(200)
        .json(new APIResponse(200, video[0], "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video ID")
    }

    if (!title && !description && !req.file?.path) {
        throw new APIError(400, "At least one field is required to update")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new APIError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You do not have permission to update this video")
    }

    const updateFields = {}
    if (title && title.trim() !== "") updateFields.title = title.trim()
    if (description && description.trim() !== "") updateFields.description = description.trim()

    if (req.file?.path) {
        const thumbnail = await uploadOnCloudinary(req.file.path)
        if (!thumbnail?.url) {
            throw new APIError(500, "Failed to upload new thumbnail")
        }
        if (video.thumbnail) {
            await deleteFromCloudinary(video.thumbnail)
        }
        updateFields.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        { new: true }
    )

    return res
        .status(200)
        .json(new APIResponse(200, updatedVideo, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new APIError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You do not have permission to delete this video")
    }

    if (video.videoFile) {
        await deleteFromCloudinary(video.videoFile, "video")
    }

    if (video.thumbnail) {
        await deleteFromCloudinary(video.thumbnail, "image")
    }

    await Video.findByIdAndDelete(videoId)
    await Like.deleteMany({ video: videoId })
    await Comment.deleteMany({ video: videoId })

    return res
        .status(200)
        .json(new APIResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new APIError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new APIError(403, "You do not have permission to toggle publish status")
    }

    video.isPublished = !video.isPublished
    await video.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { isPublished: video.isPublished },
                "Publish status toggled successfully"
            )
        )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
