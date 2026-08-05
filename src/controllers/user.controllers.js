import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIRespone.js"
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

export { registerUser, loginUser, logoutUser, refreshAccessToken }