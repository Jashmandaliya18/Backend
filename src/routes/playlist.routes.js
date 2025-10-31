import { Router } from "express";
import {
    getPlaylistById,
    createPlaylist
}
    from "../controllers/playlist.controllers.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";



const router = Router();

router.route("/createPlaylist").post(verifyJWT, createPlaylist)
// router.route("/:playlistId").get(verifyJWT, getPlaylistById)

export default router; 