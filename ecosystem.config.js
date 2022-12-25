module.exports = {
  apps : [{
    name: "app",
    script: "./index.js",
    // prefix logs with time
    time: true,
    log_date_format: "YYYY-MM-DD HH:mm Z",
    // Config out file for web errors
    error_file: "./logs/puppeteer.err.log",
    // Config out file for web logs
    out_file: "./logs/puppeteer.out.log",
    // Enable or disable auto restart after process failure
    autorestart: true,
    // listen for event ready from process
    wait_ready: true,
    // wait 20s before timing out the ready event
    listen_timeout: 20000,
    // wait 10s before killing process
    kill_timeout: 10000,
    // delay before app restarts
    restart_delay: 6000,
    // shutdown using message, not SIGKILL
    shutdown_with_message: true,
    // development env variables
    env: {
      NODE_ENV: "DEV",
      USER_NAME: process.env.USER_NAME,
      PASSWORD: process.env.PASSWORD,
      STUDENT_ID: process.env.STUDENT_ID,
    },
    env_production: {
      NODE_ENV: "PROD",
      USER_NAME: process.env.USER_NAME,
      PASSWORD: process.env.PASSWORD,
      STUDENT_ID: process.env.STUDENT_ID,
    }
  }]
}