// require("dotenv").config({ path: "./.env" });
// import express from 'express';
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({ path: "./.env" });


connectDB()
    .then(() => {
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server is Running on port ${PORT}`);
        })
    })
    .catch((err) => {
        console.error("Failed to connect to the database", err);
    })
