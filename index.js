const CookieManager = require("./src/helpers/CookieManager");
const process = require("process");
const config = require("./src/config");
const { webadvisor } = require("./src/config");
const rl = require("readline");

const cookieManager = new CookieManager();


const exitPuppeteer = async (signal) => {
  console.log("SIGINT received, closing browser and logging out...");
  await cookieManager.logout();
  console.log("logged out successfully!");
  process.exit(0);
}

// closing application when user is on windows
if (process.platform === "win32"){
  const readline = rl.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.on("SIGINT", () => {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", exitPuppeteer);

(async () => {
  try {    
    await cookieManager.fetchCookie();
    const page = cookieManager.getPage();
    await page.setDefaultNavigationTimeout(0);
    let refreshAttempts = 0;
    const maxAttempts = 40;
    let messages = null;

    do {
      // in order to keep the session, we navigate to a different
      // route on the authenticated app
      if (refreshAttempts >= maxAttempts){
          await page.goto(webadvisor.home, { timeout: 0, waitUntil: "networkidle2" });
          await page.waitForTimeout(5000); // stay for around 5 seconds then leave
          await page.goto(webadvisor.register, { timeout: 0, waitUntil: "networkidle0" });
          // reset the amount of attempts before a refresh
          refreshAttempts = 0;
      }

      let currentTerm = await page.evaluate(
        () => document.getElementById("schedule-activeterm-text").innerHTML // current term displayed
      );

      // get to the current term we want to register
      while (currentTerm != "Winter 2023") {
        console.log(currentTerm);
        await page.click("#schedule-next-term"); // click next term
        await page.waitForTimeout(500);
        currentTerm = await page.evaluate(
          () => document.getElementById("schedule-activeterm-text").innerHTML // current term displayed
        );
      }

      // get the button without disabled property (regardless if it exists or not)
      await page.$eval("#register-button", (btn) =>
        btn.removeAttribute("disabled")
      );
      await page.$eval("#register-button", (btn) => btn.click());
      await page.waitForSelector("#notification-messages-list", {
        visible: true,
        timeout: 0,
      });

      // get the notifications messages
      messages = await page.$$eval(".esg-alert__message-text", (alerts) =>
        alerts.map((alert) => alert.textContent)
      );
      console.log(messages);

      // reset
      await page.click("#notificationMenu");
      await page.waitForTimeout(2000);
      refreshAttempts++;
    } while(messages.length > 0)
    
  } catch (err) {
    console.error(err);
  }


})();
