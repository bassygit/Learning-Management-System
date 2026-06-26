import { connect } from "mongoose";

const ConnectDb = async () => {
            try {
                        await connect(process.env.MONGO_URI);
                        console.log('mongoDb connected successfully')
            } catch (error) {
                        console.log('error connecting to db', error.message)

            }
}
export default ConnectDb;