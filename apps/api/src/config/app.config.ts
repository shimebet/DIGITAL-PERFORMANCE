export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  port: Number(process.env.PORT ?? 3000),

  frontendUrl:
    process.env.FRONTEND_URL ?? 'http://localhost:5173',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,

    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});