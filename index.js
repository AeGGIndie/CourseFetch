const CookieManager = require("./src/helpers/CookieManager");
const process = require("process");

(async () => {
  const cookieManager = new CookieManager();
  process.on("SIGINT", async () => {
    console.log("SIGINT received, closing browser and logging out...");
    await cookieManager.logout();
    console.log("logged out successfully!");
    process.exit(1);
  });

  try {
    await cookieManager.fetchCookie();
    const page = cookieManager.getPage();
    await page.setDefaultNavigationTimeout(0);

    let currentTerm = await page.evaluate(
      () => document.getElementById("schedule-activeterm-text").innerHTML // current term displayed
    );

    while (true) {
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
      const messages = await page.$$eval(".esg-alert__message-text", (alerts) =>
        alerts.map((alert) => alert.textContent)
      );
      console.log(messages);

      // reset
      await page.click("#notificationMenu");
      await page.waitForTimeout(2000);
    }
  } catch (err) {
    console.error(err);
  }
})();
