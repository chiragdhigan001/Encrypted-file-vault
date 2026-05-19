import mongoose from "mongoose";

const connectDb = async () => {
    mongoose.connection.on("connected", () => {
        console.log("Database connected successfully");
    });

    // Remove the template literal syntax and just pass the URI directly
    await mongoose.connect(process.env.MONGO_URI);
}

export default connectDb;