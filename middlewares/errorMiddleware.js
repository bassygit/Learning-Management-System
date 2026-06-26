
const errorHandler = (err, req, res, next) => {
            // log full error in terminal
            console.error(err);

            // default error values
            let statusCode = err.statusCode || 500;
            let message = err.message || "Something went wrong";

            // ---- MONGOOSE ERRORS ----

            // invalid MongoDB ID
            // e.g passing "allorders" as an id instead of a valid ObjectId
            if (err.name === 'CastError') {
                        statusCode = 400;
                        message = `Invalid ${err.path}: ${err.value}`;
            }

            // duplicate field
            // e.g registering with an email that already exists
            if (err.code === 11000) {
                        statusCode = 400;
                        const field = Object.keys(err.keyValue)[0];
                        message = `${field} already exists`;
            }

            // mongoose validation error
            // e.g required field missing
            if (err.name === 'ValidationError') {
                        statusCode = 400;
                        message = Object.values(err.errors)
                                    .map(val => val.message)
                                    .join(', ');
            }

            // document not found
            if (err.name === 'DocumentNotFoundError') {
                        statusCode = 404;
                        message = 'Document not found';
            }

            // ---- JWT ERRORS ----

            // invalid token
            // e.g token was tampered with
            if (err.name === 'JsonWebTokenError') {
                        statusCode = 401;
                        message = 'Invalid token, please login again';
            }

            // expired token
            // e.g token has passed its expiry time
            if (err.name === 'TokenExpiredError') {
                        statusCode = 401;
                        message = 'Token expired, please login again';
            }

            // ---- SYNTAX ERRORS ----

            // invalid JSON in request body
            if (err.name === 'SyntaxError') {
                        statusCode = 400;
                        message = 'Invalid JSON in request body';
            }

            // send the error response
            return res.status(statusCode).json({
                        success: false,
                        message,
                        // only show stack trace in development
                        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
};

export default errorHandler;