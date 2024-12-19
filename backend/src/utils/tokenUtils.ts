import jwt from 'jsonwebtoken';


///////////////////////////////////////////////////////////////////////////////////////////
// Function to standardize JWT creation in API endpoints.
function createAccessToken (userId: number) {
  return jwt.sign({ userId: userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '5m' });
}

function createRefreshToken (userId: number) {
  return jwt.sign({ userId: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function to call in API endpoints for JWT authentication.
function verifyToken(refreshToken: string, callback: any) {
  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, (err, decoded) => callback(err, decoded));
}

///////////////////////////////////////////////////////////////////////////////////////////
// Middleware to call before API endpoints for JWT authentication.
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];

  // Check for the Authorization header
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing', error: 'NO_TOKEN'});
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: 'Access token missing', error: 'INVALID_TOKEN_FORMAT' });
  }

  // Verify the access token
  jwt.verify(token, process.env.JWT_ACCESS_SECRET!, (err: any, decodedToken: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid access token', error: 'INVALID_TOKEN'});
    }
    // Any endpoints using this middleware have access to token information.
    // For example 'req.token.userId'.
    req.token = decodedToken; // Attach user data to the request
    next();
  });
}

///////////////////////////////////////////////////////////////////////////////////////////
// Config for cookies sent to browser.
const cookieSettings = {
  httpOnly: true,                        // Prevents client-side JavaScript from accessing the cookie
  secure: process.env.NODE_ENV! === 'production', // Ensures cookies are sent only over HTTPS in production
  sameSite: 'strict',                    // Prevents CSRF by limiting cross-site requests
  maxAge: 30 * 24 * 60 * 60 * 1000,      // Refresh token expiration in milliseconds (30 days)
};

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'tokenUtils.ts'.
export {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  authenticateToken,
  cookieSettings,
};
