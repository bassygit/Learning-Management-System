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