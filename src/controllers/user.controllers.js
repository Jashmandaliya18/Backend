import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Apiresponce } from "../utils/Apiresponce.js";

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

    const { fullName, email, userName, password } = req.body
    console.log("Email: ", email);

    // if (fullName === "") {
    //     throw new Apierror(400, "Fullname is required")
    // }

    if (
        [fullName, email, userName, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new Apierror(400, "All field are required");
    }

    const existedUser = User.findOne({
        $or: [{ userName }, { email }]
    })
    if (existedUser) {
        throw new Apierror(409, "User with email or username already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.converImage[0]?.path;

    if (!avatarLocalPath) {
        throw new Apierror(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new Apierror(400, "Avatar is reuqired");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",// is avatar is not uploaded then is is empty because avatar is not compulsory.
        email,
        password,
        userName: userName.toLowerCase()
    })

    const cretedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!cretedUser) {
        throw new Apierror(500, "Something went wrong while registering Use");
    }

    return res.status(201).json(
        new Apiresponce(200, cretedUser, "User registered Succefully")
    )



})

export { registerUser };
