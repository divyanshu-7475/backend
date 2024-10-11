import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/User.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens= async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave : false})
        return ({refreshToken,accessToken})
    } catch (error) {
        throw new ApiError(500,"something went wrong on generating tokens")
    }
}


const registerUser = asyncHandler( async (req,res)=> {
    // get user details from frontend

    const {fullname, email, username , password}=req.body
    //console.log("body:",req.body);
    
    
    // validation --not empty
    if(
        [fullname, email, username, password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are is required");
        
    }
    // check-uder exist?
    const existingUser= await User.findOne({
        $or: [{username},{email}]
    })
    if (existingUser) {
        throw new ApiError(409,"User already exist");
        
    }
    // check -images
    //console.log("file: ",req.files);
    
    const avatarLocalPath=req.files?.avatar[0]?.path
    //const coverImageLocalPath=req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar is required");
        
    }

    // upload files to cloudinary
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar is required");
    }

    // create user and entry in database
    const user= await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url ||"",
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500,"something went wrong on registering")
    }
    // return response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "registered succssfully")
    )
})

const loginUser=asyncHandler(async (req, res)=>{
    //req body

    const {username,email,password}= req.body

    // username /email check

    if (!(username || email)) {
        throw new ApiError(400,"username or email is required")
    }
    
    //find the user

    const user = await User.findOne({
        $or : [{username},{email}]
    })
    if (!user){
        throw new ApiError(404, "user doesn't exist" )
    }
    
    //password check

    const ispasswordValid=await user.isPasswordCorrect(password)
    if (!ispasswordValid) {
        throw new ApiError(401, "Password is incorrect")
    }

    
    //access and refresh token
    
    const {refreshToken,accessToken}=await generateAccessAndRefreshTokens(user._id)

    //send cookies

    const logedInUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    const options={
        httpOnly:true,
        secure :true
    }
    return res.status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user: logedInUser , accessToken,refreshToken
            },
            "user loged in successfully"
        )
    )
})

const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set: {
            refreshToken : undefined
        }
    },
{
    new: true
})
const options= {
    httpOnly : true,
    secure:true
}
return res.status(200)
.clearCookie("accessToken", options)
.clearCookie("refreshToken", options)
.json( new ApiResponse(200,{},"user loged out successfully"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken ||req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken= jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"invalid user")
        }
    
        if(incomingRefreshToken!==user.refreshToken){
            throw new ApiError(401,"refresh token is expired")
        }
    
        const options ={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message|| "invalid user access")
    }


})

export {registerUser, loginUser, logoutUser,refreshAccessToken}