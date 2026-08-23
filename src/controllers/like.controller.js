import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID")
  }

  const video = await Video.findById(videoId)
  if (!video) {
    throw new APIError(404, "Video not found")
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id
  })

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id)
    return res
      .status(200)
      .json(new APIResponse(200, { isLiked: false }, "Video unliked successfully"))
  }

  await Like.create({
    video: videoId,
    likedBy: req.user._id
  })

  return res
    .status(200)
    .json(new APIResponse(200, { isLiked: true }, "Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params

  if (!isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment ID")
  }

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new APIError(404, "Comment not found")
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id
  })

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id)
    return res
      .status(200)
      .json(new APIResponse(200, { isLiked: false }, "Comment unliked successfully"))
  }

  await Like.create({
    comment: commentId,
    likedBy: req.user._id
  })

  return res
    .status(200)
    .json(new APIResponse(200, { isLiked: true }, "Comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params

  if (!isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet ID")
  }

  const tweet = await Tweet.findById(tweetId)
  if (!tweet) {
    throw new APIError(404, "Tweet not found")
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id
  })

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id)
    return res
      .status(200)
      .json(new APIResponse(200, { isLiked: false }, "Tweet unliked successfully"))
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id
  })

  return res
    .status(200)
    .json(new APIResponse(200, { isLiked: true }, "Tweet liked successfully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(String(req.user._id)),
        video: { $exists: true, $ne: null }
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
          }
        ]
      }
    },
    {
      $addFields: {
        video: {
          $first: "$video"
        }
      }
    },
    {
      $match: {
        video: { $ne: null }
      }
    },
    {
      $project: {
        _id: 1,
        video: 1,
        createdAt: 1
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
    .json(new APIResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos
}