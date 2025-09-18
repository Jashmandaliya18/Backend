// require("dotenv").config({ path: "./.env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ path: "./.env" });

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Seerver is Running on port ${process.env.PORT || 8000}`);
        })
    })
    .catch((err) => {
        console.error("Failed to connect to the database", err);
    })
