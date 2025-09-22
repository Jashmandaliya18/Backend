// require("dotenv").config({ path: "./.env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from 'express';
// import {app} from "./app.js";

dotenv.config({ path: "./.env" });

const app = express();


connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is Running on port ${process.env.PORT || 8000}`);
        })
    })
    .catch((err) => {
        console.error("Failed to connect to the database", err);
    })
