module.exports = {
  apps: [
    {
      name: "aidash",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/opt/aidash/app",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
