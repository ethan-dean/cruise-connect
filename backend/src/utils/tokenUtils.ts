import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


///////////////////////////////////////////////////////////////////////////////////////////
// Secrets.
dotenv.config()   // Provides JWT_SECRET

///////////////////////////////////////////////////////////////////////////////////////////
// Function to standardize JWT creation in API endpoints.
function createToken (userId: number) {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );
}

///////////////////////////////////////////////////////////////////////////////////////////
// Middleware function to call in API endpoints for JWT authentication.
function authenticateToken(req: any, res: any, next: any) {
  const authHeader: string | undefined = req.headers['authorization'];
  if (!authHeader) // No token at all.
  {
    return res.status(400).json({ message: 'Did not find token Authorization header' });
  }
  const token: string | undefined = authHeader.split(' ')[1];
  if (!token) // Doesn't have correct format.
  {
    return res.status(400).json({ message: 'Incorrect format of token Authorization header' });
  }
  jwt.verify(token, process.env.JWT_SECRET!, (err: any, token: any) => {
    if (err)  // Invalid token.
    {
      return res.status(401).json({ message: 'Invalid token', error: err });
    }
    // Any endpoints using this middleware have access to token information.
    // For example 'req.token.userId' or 'req.token.firstName'.
    req.token = token;
    next();
  });
}

///////////////////////////////////////////////////////////////////////////////////////////
// Function exports for 'tokenUtils.ts'.
export {
  createToken,
  authenticateToken,
};
