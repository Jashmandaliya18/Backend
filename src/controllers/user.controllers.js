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

    const { userName, email, fullName, password } = req.body
    console.log("Email: ", email);
    console.log(req.body); // came data in object type.

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
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

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

export { registerUser };
