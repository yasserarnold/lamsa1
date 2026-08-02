module.exports = {
  apps: [
    {
      name: "lamsa",
      script: ".output/server/index.mjs",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
    },
  ],
};
