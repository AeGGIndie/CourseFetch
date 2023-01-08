const process = require("process");
const rl = require("readline");
const { sleep } = require("./utils");

const handleWindowsSignals = () => {
  // closing application when user is on windows
  if (process.platform === "win32") {
    const readline = rl.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.on("SIGINT", () => {
      process.emit("SIGINT");
    });
  }
};

const handleExit = async (cookieManager, requestControllers) => {
  handleWindowsSignals();

  const exitPuppeteer = async (signal) => {
    console.log("SIGINT received, closing browser and logging out...");
    // stop all requests first
    if (requestControllers){
      requestControllers.forEach(controller => controller.abort());
    }
    await cookieManager.logout();
    await sleep(2000);
    console.log("logged out successfully!");
    process.exit(0);
  };

  const forceExit = async (signal) => {
    return (err) => {
      if (err) console.error(err.stack || err);
      console.log("received", signal);
      console.log("waiting for 15 seconds before exiting...");
      setTimeout(() => {
        process.exit(err ? 1 : 0);
      }, 1000 * 10);
    };
  };
  process.on("message", async (msg) => {
    if (msg == "shutdown"){
        await exitPuppeteer();
    }
  });
//  process.on("SIGINT", exitPuppeteer);
//  process.on("SIGTERM", exitPuppeteer);
  process.on("uncaughtException", forceExit);
};

module.exports = handleExit;
