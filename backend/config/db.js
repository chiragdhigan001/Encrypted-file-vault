import mongoose from "mongoose";

const connectDb = async () => {

    mongoose.connection.on("connected", () => {
        console.log("Database connected successfully");
    })

    await mongoose.connect(`${process.env.MONGO_URI}/users_db`)
}

export default connectDb;