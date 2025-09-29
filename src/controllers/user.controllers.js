import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Apiresponce } from "../utils/Apiresponce.js";

// method for access and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId); // find that user by user_id
        const accessToken = user.generateAccessToken() // generate access token by method
        const refreshToken = user.generateRefreshToken() // generate refresh token by method

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

    if (!userName || !email) { // check that username or email is empty or not
        throw new Apierror(400, "username or email is requred")
    }
    const user = await User.findOne({ // find first instance from database based on username or email
        $or: [{ userName, email }]
    })
    if (!user) {  // checking for user if available or not
        throw new Apierror(404, "User does not exist");
    }
    const ispasswordValid = await user.isPassowordCorrect(password); // password validation
    if (!ispasswordValid) {
        throw new Apierror(404, " Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = { // it allowa modifiedable by server only not from fronted
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accesToken", accessToken, options)
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




export { registerUser, loginUser };
