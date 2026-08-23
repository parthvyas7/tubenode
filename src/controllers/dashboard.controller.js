import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id

  const totalSubscribers = await Subscription.countDocuments({
    channel: userId
  })

  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(userId))
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
      $project: {
        views: 1,
        totalLikes: {
          $size: "$likes"
        }
      }
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: "$totalLikes" }
      }
    }
  ])

  const stats = {
    totalSubscribers: totalSubscribers || 0,
    totalVideos: videoStats[0]?.totalVideos || 0,
    totalViews: videoStats[0]?.totalViews || 0,
    totalLikes: videoStats[0]?.totalLikes || 0
  }

  return res
    .status(200)
    .json(new APIResponse(200, stats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(userId))
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
      $addFields: {
        likesCount: {
          $size: "$likes"
        }
      }
    },
    {
      $project: {
        likes: 0
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    }
  ])

  return res
    .status(200)
    .json(new APIResponse(200, videos, "Channel videos fetched successfully"))
})

export {
  getChannelStats,
  getChannelVideos
}