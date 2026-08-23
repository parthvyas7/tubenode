import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  } catch (error) {
    throw new APIError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body

  if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
    throw new APIError(400, "All fields are required")
  }

  const userExists = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (userExists) {
    throw new APIError(409, "User with email or username already exists")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new APIError(400, "Reupload Avatar file!")
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registration")
  }

  return res.status(201).json(new APIResponse(200, createdUser, "User registered Successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if ([email, password].some((field) => field?.trim() === "")) {
    throw new APIError(400, "All fields are required")
  }

  const user = await User.findOne({ email })

  if (!user) {
    throw new APIError(401, "Invalid email or password")
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password)

  if (!isPasswordCorrect) {
    throw new APIError(401, "Invalid email or password")
  }

  const accessToken = user.generateAccessToken()

  return res.status(200).json(new APIResponse(200, { accessToken }, "User logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id

  const user = await User.findById(userId)

  if (!user) {
    throw new APIError(404, "User not found")
  }

  user.refreshToken = null
  await user.save()

  return res.status(200).json(new APIResponse(200, null, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

  if (!incomingRefreshToken) {
    throw new APIError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new APIError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new APIError(401, "Refresh token is expired or used")

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APIResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid refresh token")
  }

})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(
      200,
      req.user,
      "User fetched successfully!"
    ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body

  if (!fullName || !email) {
    throw new APIError(400, "All fields are required!")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    { new: true }

  ).select("-password")

  return res
    .status(200)
    .json(new APIResponse(200, user, "Account details updated successfully!"))
});

const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new APIError(400, "Invalid password!")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully!"))
})

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is missing")
  }

  // TODO: Delete old image

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
    throw new APIError(400, "Error while uploading on avatar!")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(
      new APIResponse(200, user, "Avatar image updated successfully!")
    )
})

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new APIError(400, "Cover image file is missing!")
  }

  //TODO: delete old image
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
    throw new APIError(400, "Error while uploading on cover image!")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(
      new APIResponse(200, user, "Cover image updated successfully!")
    )
})

const getChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new APIError(400, "Username is missing!")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
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
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
      }
    }
  ])

  if (!channel?.length) {
    throw new APIError(404, "Channel does not exists!")
  }

  return res
    .status(200)
    .json(
      new APIResponse(200, channel[0], "Channel fetched successfully!")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
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
    }
  ])

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully!"
      )
    )
})

export {
  registerUser, loginUser,
  logoutUser, refreshAccessToken, updateAccountDetails,
  getCurrentUser, updatePassword,
  updateAvatar, updateCoverImage, getChannelProfile, getWatchHistory
}