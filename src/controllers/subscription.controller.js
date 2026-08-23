import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params

  if (!isValidObjectId(channelId)) {
    throw new APIError(400, "Invalid channel ID")
  }

  if (channelId.toString() === req.user._id.toString()) {
    throw new APIError(400, "You cannot subscribe to your own channel")
  }

  const channel = await User.findById(channelId)
  if (!channel) {
    throw new APIError(404, "Channel not found")
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId
  })

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id)
    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          { isSubscribed: false },
          "Unsubscribed from channel successfully"
        )
      )
  }

  await Subscription.create({
    subscriber: req.user._id,
    channel: channelId
  })

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isSubscribed: true },
        "Subscribed to channel successfully"
      )
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params

  if (!isValidObjectId(channelId)) {
    throw new APIError(400, "Invalid channel ID")
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(String(channelId))
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
        subscriber: {
          $first: "$subscriber"
        }
      }
    },
    {
      $project: {
        _id: 1,
        subscriber: 1,
        createdAt: 1
      }
    }
  ])

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params

  if (!isValidObjectId(subscriberId)) {
    throw new APIError(400, "Invalid subscriber ID")
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(String(subscriberId))
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
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
        channel: {
          $first: "$channel"
        }
      }
    },
    {
      $project: {
        _id: 1,
        channel: 1,
        createdAt: 1
      }
    }
  ])

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    )
})

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels
}