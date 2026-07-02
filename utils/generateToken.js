import jwt from 'jsonwebtoken'
export const generateToken = (payload, expiresIn = "7days") => {
            const secret = process.env.JWT_SECRET
            if (!secret) throw new Error('JWT_SECRET is not defined in .env')

            return new Promise((resolve, reject) => {
                        jwt.sign(payload, secret, { expiresIn }, (err, token) => {
                                    if (err) return reject(err);

                                    resolve(token);
                        });
            });
};

export default generateToken;



// export const generateToken = (payload, expiresIn = 2days) => {
//const secret =process.env.JWT_SECRET
//if(!secret)throw new Error('JWT_SECRET is not defined in .env')
// try{
//const token = (payload,secret {expiresIn})
//return token
//
//}catch(error) {
//throw new Error('Token generation failed: ${error.message}')
//
//}
//
//
//

//}
//export default generateToken 