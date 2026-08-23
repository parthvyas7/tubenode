import { APIError } from "../utils/APIError.js"
import { APIResponse } from "../utils/APIResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
  return res.status(200).json({ status: "ok", message: "Healthcheck passed" })
})

export {
  healthcheck
}
