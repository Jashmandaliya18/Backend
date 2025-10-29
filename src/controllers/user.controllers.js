import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Apiresponce } from "../utils/Apiresponce.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    let accessToken, refreshToken;
    try {
        const user = await User.findById(userId); // find that user by user_id
        accessToken = user.generateAccessToken() // generate access token by method
        refreshToken = user.generateRefreshToken() // generate refresh token by method

        user.refreshToken = refreshToken; // add a refreshToken value in object
        await user.save({ validateBeforeSave: false }); // save the data in database

    } catch (error) {
        throw new Apierror(500, "Something went wrong while generating Access and Refresh Token");
    }

    return { accessToken, refreshToken };
}

const registerUser = asyncHandler(async (req, res) => {
    // steps for register User ->
    // get user details from fronted
    // validation of data - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar upload checking
    // create user object - create entry in DB
    // remove password and refresh token field form responce
    // check for user creation ( responce checking )
    // return response

    const { userName, email, fullName, password } = req.body
    // console.log("Email: ", email);
    // console.log(req.body); // came data in object type.

    if (
        [userName, email, fullName, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new Apierror(400, "All field are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new Apierror(409, "User with email or username already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path; //it may be not available 

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new Apierror(400, "Avatar is required");
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new Apierror(400, "Avatar upload failed");
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",// is avatar is not uploaded then is is empty because avatar is not compulsory.
        password,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new Apierror(500, "Something went wrong while registering Use");
    }
    console.log("User Register Succefully !!!");


    return res.status(201).json(
        new Apiresponce(200, createdUser, "User registered Succefully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    /* steps->
    my->
     take userName  or email from user
     take password from user 
     checkbox for access
     if user have no account then asking for register user
     if have account
        -> compare email
        -> compare password
            > correct : log in that user and give access
            > incorrect : show a error for incorrect passeord
    chai->
     req body -> data  
     username , email
     find the user
     passeword check
     access and refresh token
     send cookie

    */

    const { email, userName, password } = req.body; // take a username or email and password
    // console.log("Login req body: ", req.body);

    if (!(userName || email)) { // check that username or email is empty or not
        throw new Apierror(400, "username or email is required")
    }
    // const user = await User.findOne({ // find first instance from database based on username or email
    //     $or: [{ userName, email }]
    // })
    const user = await User.findOne({
        $or: [
            { userName: userName || "" },
            { email: email || "" }
        ]
    });
    // console.log("Found User: ", user);
    if (!user) {  // checking for user if available or not
        throw new Apierror(404, "User does not exist");
    }
    const ispasswordValid = await user.isPasswordCorrect(password); // password validation
    // console.log("Password is Match", ispasswordValid);

    if (!ispasswordValid) {
        throw new Apierror(404, " Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = { // it allowa modifiedable by server only not from fronted
        httpOnly: true,
        secure: false
        // secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new Apiresponce(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User Logged In Successfully"
            )
        )
})

const logOutUser = asyncHandler(async (req, res) => {
    // first we need to reset a cookie 
    // then reset the refresh_token of (user.model.js) so that means user log out.
    // so we need to find a user from database like .findonebyid(userId), but we do not have id, so we use a concept of middleware for log out the user.
    // make a middleware for it.

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = { // it allowa modifiedable by server only not from fronted
        httpOnly: true,
        secure: false
        // secure: true,
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new Apiresponce(200, null, "User Logged Out Successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new Apierror(401, "Unauthorized Request ");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new Apierror(401, "Invalid Refresh Token");
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new Apierror(401, "refresh Token is expired or used")
        }

        const options = {
            httponly: true,
            secure: true,
        }
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new Apiresponce(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "access token refresh succefully"
                )
            )
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid Refresh Token")
    }


})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new Apierror(400, "Old Password is Incorrect")
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new Apiresponce(200, {}, "Password changed Succefully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new Apiresponce(
            200,
            req.user,
            "Current user fetched succefully"
        ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new Apierror(401, "FullName and Email is required ")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,

            }
        },
        {
            new: true,
        }
    ).select("-password")

    return res
        .status(200)
        .json(new Apiresponce(
            200,
            user,
            "Account details updated succefully"
        ))
})

const avatarUpdate = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new Apierror(401, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new Apierror(401, "Error while uploading on avatar")
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
        .json(new Apiresponce(200, user, "Avatar updated succefully"))
})

const coverImageUpdate = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new Apierror(401, "Cover Image file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new Apierror(401, "Error while uploading on Cover Image")
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
        .json(new Apiresponce(200, user, "Cover Image updated succefully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new Apierror(401, "Username is missing")
    }
    // Aggregate pipelines
    const channel = await User.aggregate([
        {
            $match: {
                // username: username?.toLowerCase()
                userName: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers"
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "SubscribedTo"
            }
        },
        {
            $addFields: {
                SubscriberCount: {
                    $size: "$Subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$SubscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$Subscribers.subscriber"] },
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
                SubscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    console.log("Channel: ", channel);

    if (!channel?.length) {
        throw new Apierror(401, "Channel is not exist")
    }

    return res
        .status(200)
        .json(new Apiresponce(200, channel[0], "User Channel fetched successfully")
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
                from: "Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "User",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
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
    ])

    return res
        .status(200)
        .json(new Apiresponce(200, user[0].watchHistory, "Watch History Fetched Succefully"))
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    avatarUpdate,
    coverImageUpdate,
    getUserChannelProfile,
    getWatchHistory
}
