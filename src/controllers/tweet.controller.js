import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { Like } from "../models/like.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body

  if (!content || content.trim() === "") {
    throw new APIError(400, "Tweet content is required")
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user._id
  })

  if (!tweet) {
    throw new APIError(500, "Failed to create tweet")
  }

  return res
    .status(201)
    .json(new APIResponse(201, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params

  if (!isValidObjectId(userId)) {
    throw new APIError(400, "Invalid user ID")
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(String(userId))
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes"
      }
    },
    {
      $addFields: {
        owner: {
          $first: "$owner"
        },
        likesCount: {
          $size: "$likes"
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
    },
    {
      $sort: {
        createdAt: -1
      }
    }
  ])

  return res
    .status(200)
    .json(new APIResponse(200, tweets, "User tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const { content } = req.body

  if (!isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet ID")
  }

  if (!content || content.trim() === "") {
    throw new APIError(400, "Tweet content cannot be empty")
  }

  const tweet = await Tweet.findById(tweetId)
  if (!tweet) {
    throw new APIError(404, "Tweet not found")
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new APIError(403, "You do not have permission to update this tweet")
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: content.trim()
      }
    },
    { new: true }
  )

  return res
    .status(200)
    .json(new APIResponse(200, updatedTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params

  if (!isValidObjectId(tweetId)) {
    throw new APIError(400, "Invalid tweet ID")
  }

  const tweet = await Tweet.findById(tweetId)
  if (!tweet) {
    throw new APIError(404, "Tweet not found")
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new APIError(403, "You do not have permission to delete this tweet")
  }

  await Tweet.findByIdAndDelete(tweetId)
  await Like.deleteMany({ tweet: tweetId })

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Tweet deleted successfully"))
})

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet
}