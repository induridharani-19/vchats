import jwt from 'jsonwebtoken';

export interface ITokenPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

export const signAccessToken = (payload: ITokenPayload): string => {
  const secret = process.env.JWT_ACCESS_SECRET || 'vchats_access_token_secret_2026_super_secure_key_98231';
  const expiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  return jwt.sign(payload, secret, { expiresIn: expiry as any });
};

export const signRefreshToken = (payload: ITokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'vchats_refresh_token_secret_2026_super_secure_key_10293';
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiry as any });
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  const secret = process.env.JWT_ACCESS_SECRET || 'vchats_access_token_secret_2026_super_secure_key_98231';
  return jwt.verify(token, secret) as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET || 'vchats_refresh_token_secret_2026_super_secure_key_10293';
  return jwt.verify(token, secret) as ITokenPayload;
};
