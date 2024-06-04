import jwt from "jsonwebtoken";

export function jwtMiddleware(req, res, next) {
    const token = req?.headers['authorization'] || undefined;
    if (!token) {
        return res?.status(401).json({message: 'Not authenticated'});
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res?.status(401).json({message: 'Unauthorized'});
        }

        req.decoded = decoded;
        next();
    });
}