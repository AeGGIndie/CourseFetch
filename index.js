/**
 * By inspecting the GET response for https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans
 * we can see several endpoints for which we can obtain data.
 * In order to get the current users "planned" and unregistered courses,
 * we'll have to navigate to /Student/Planning/DegreePlans/CurrentAsync and
 * inspect the JSON accordingly
 */
const CookieManager = require("./src/CookieManager");
const process = require("process");
const axios = require("axios");
const fetch = require("node-fetch");
const handleExit = require("./src/helpers/handleExit");
const { registerWithAxios, sleep } = require("./src/helpers/utils");

// prepare to scrape and setup exit handlers
const cookieManager = new CookieManager();
handleExit(cookieManager);

(async () => {
  try {
    await cookieManager.fetchCookie();
    const page = cookieManager.getPage();
    await page.setDefaultNavigationTimeout(0);
    await page.waitForSelector("#schedule-next-term");
    let cookie = cookieManager.getCookie();
    let verificationToken = cookieManager.getRequestVerificationToken();
    if (!cookie) {
      throw new Error("no cookie");
    }
    if (!verificationToken) {
      throw new Error("no verification token");
    }

    let data = null; // holds the response data
    let tries = 0; // number of tries before refreshing
    const MAX_TRIES = 30; // once tries reached max, refresh

    do {
      if (tries > MAX_TRIES) {
        console.log("Refreshing session...");
        await cookieManager.refreshSession();
        cookie = cookieManager.getCookie();
        verificationToken = cookieManager.getRequestVerificationToken();
        console.log("successfully refreshed!");
        tries = 0;
      }

      const res = await registerWithAxios(verificationToken, cookie);
      data = res.data;
      console.log(data);
      await sleep(500);
      tries++;
    } while (data.length > 0);
  } catch (err) {
    console.error(new Date().toString(), err);
  } finally {
    await cookieManager.logout();
    process.exit(0);
  }
})();
