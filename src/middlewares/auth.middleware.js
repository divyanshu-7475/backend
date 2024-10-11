import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import {User} from "../models/User.model.js"

export const verifyJWT = asyncHandler(async (req, _, next)=>{
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if (!token) {
            throw new ApiError(401, "unauthorized request")
        }
    
        const decodecToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
       const user= await User.findById(decodecToken?._id).select("-password -refreshToken")
    
       if (!user) {
        throw new ApiError(401,"Invalid Access Token")
        
       }
    
       req.user=user;
       next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Access Token") 
    }




})