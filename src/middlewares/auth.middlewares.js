import { asyncHandler } from "../utils/asyncHandler";
import { Apierror } from "../utils/Apierror.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models";


export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accesToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) {
            throw new Apierror(401, "You are not authorized to access this route")
        }
        const decodedInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedInfo?._id).select("-password -refreshToken")

        if (!user) {
            throw new Apierror("401", "Invalid access tok")
        }

        req.user = user;
        next();
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid access token");
    }
})