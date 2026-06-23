module.exports = {
  apps: [
    {
      name: "filerepo-backend",
      cwd: __dirname,
      script: "npm",
      args: "run start -w @filerepo/backend",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "filerepo-frontend",
      cwd: __dirname,
      script: "npm",
      args: "run start -w @filerepo/frontend",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "filerepo-scan-worker",
      cwd: __dirname,
      script: "npm",
      args: "run worker:scan-queue -w @filerepo/backend",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "filerepo-email-worker",
      cwd: __dirname,
      script: "npm",
      args: "run worker:email-queue -w @filerepo/backend",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
