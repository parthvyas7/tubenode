import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { page = 1, limit = 10 } = req.query

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID")
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(String(videoId))
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
        foreignField: "comment",
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

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10)
  }

  const comments = await Comment.aggregatePaginate(commentAggregate, options)

  return res
    .status(200)
    .json(new APIResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { content } = req.body

  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video ID")
  }

  if (!content || content.trim() === "") {
    throw new APIError(400, "Comment content is required")
  }

  const video = await Video.findById(videoId)
  if (!video) {
    throw new APIError(404, "Video not found")
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id
  })

  if (!comment) {
    throw new APIError(500, "Failed to add comment")
  }

  return res
    .status(201)
    .json(new APIResponse(201, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const { content } = req.body

  if (!isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment ID")
  }

  if (!content || content.trim() === "") {
    throw new APIError(400, "Comment content cannot be empty")
  }

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new APIError(404, "Comment not found")
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new APIError(403, "You do not have permission to update this comment")
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content.trim()
      }
    },
    { new: true }
  )

  return res
    .status(200)
    .json(new APIResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params

  if (!isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment ID")
  }

  const comment = await Comment.findById(commentId)
  if (!comment) {
    throw new APIError(404, "Comment not found")
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new APIError(403, "You do not have permission to delete this comment")
  }

  await Comment.findByIdAndDelete(commentId)
  await Like.deleteMany({ comment: commentId })

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Comment deleted successfully"))
})

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
}