const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const UserAgent = require("user-agents");
const _ = require("lodash");
const { username, password, webadvisor } = require("./config");

// configuring puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class CookieManager {
  // private
  browser = null;
  browserOptions = null;
  cdpSession = null;
  cdpRequestDataRaw = null;
  requestVerificationToken = null;
  cookie = null;

  // public
  page = null;

  constructor() {
    this.browser = null;
    this.page = null;
    this.cookie = null;
    this.requestVerificationToken = null;
    this.browserOptions = {
      handleSIGINT: false, // manually handle
      args: ["--window-size=1920,1080"],
      headless: process.env.NODE_ENV === "PROD",
      executablePath: executablePath(),
      // ignoreDefaultArgs: ['--disable-extensions'],
    };
    this.cdpSession = null;
    this.cdpRequestDataRaw = null;
  }

  // getter
  getCookie() {
    return this.cookie;
  }

  // setter
  setCookie(cookie) {
    this.cookie = cookie;
  }

  /**
   * refreshCookie Updates the cookies of the manager
   * @return {null}
   */
  async refreshCookie() {
    // gets the cookies of the current page and makes it our new cookie value
    this.setCookie(
      _.join(
        _.map(await this.page.cookies(), ({ name, value }) =>
          _.join([name, value], "=")
        ),
        "; "
      )
    );
  }

  // wrapper function for all navigation, that way when
  // we navigate to different areas the requestverificationtoken
  // header value is always updated accordingly
  async refreshRequestVfToken(navigate) {
    if (navigate == null) {
      return false;
    }
    await navigate();

    // get the header "__ReqeustVerificationToken" to send ajax requests across the page
    const requestExtracted = this.cdpRequestDataRaw
      .reverse()
      .find((requestData) => {
        if (!requestData.request) {
          return false;
        }
        if (!requestData.request.headers) {
          return false;
        }

        return "__RequestVerificationToken" in requestData.request.headers
          ? requestData.request.headers["__RequestVerificationToken"]
          : null;
      });
    this.requestVerificationToken =
      requestExtracted.request.headers["__RequestVerificationToken"];
    return true;
  }

  async refreshSession() {
    await this.refreshRequestVfToken(async () => {
      await this.page.goto(webadvisor.register);
    });

    await this.refreshCookie();
  }

  getPage() {
    return this.page;
  }

  getRequestVerificationToken() {
    return this.requestVerificationToken;
  }

  /**
   * Mainly used for debugging and developing, hence the long wait time
   */
  async open() {
    try {
      this.browser = await puppeteer.launch(this.browserOptions);
      this.page = await this.browser.newPage();
      // this.page.waitForTimeout(300 * 1000);
    } catch (err) {
      throw new Error(err);
    }
  }

  // Returns map of request ID to raw CDP request data. This will be populated as requests are made.
  // taken from https://stackoverflow.com/questions/47078655/missing-request-headers-in-puppeteer/62232903#62232903
  // and https://github.com/puppeteer/puppeteer/issues/5364
  async setupLoggingOfAllNetworkData() {
    this.cdpSession = await this.page.target().createCDPSession();
    await this.cdpSession.send("Network.enable");
    const cdpRequestDataRaw = [];
    const addCDPRequestDataListener = (eventName) => {
      this.cdpSession.on(eventName, (request) => {
        cdpRequestDataRaw.push(request);
        // cdpRequestDataRaw[request.requestId] = cdpRequestDataRaw[request.requestId] || {}
        // Object.assign(cdpRequestDataRaw[request.requestId], { [eventName]: request })
      });
    };
    addCDPRequestDataListener("Network.requestWillBeSent");
    // addCDPRequestDataListener('Network.requestWillBeSentExtraInfo')
    // addCDPRequestDataListener('Network.responseReceived')
    // addCDPRequestDataListener('Network.responseReceivedExtraInfo')
    return cdpRequestDataRaw;
  }

  async fetchCookie() {
    try {
      // create a new browser
      this.browser = await puppeteer.launch(this.browserOptions);

      // go to the login page from webadvisor
      this.page = await this.browser.newPage();
      this.cdpRequestDataRaw = await this.setupLoggingOfAllNetworkData();
      await this.page.setDefaultNavigationTimeout(0);
      await this.page.setUserAgent(new UserAgent().toString());
      await this.page.goto(webadvisor.register);

      const simulateLogin = async () => {
        await this.page.waitForSelector(".form-horizontal");
        await this.page.type("#inputUsername", username);
        await this.page.type("#inputPassword", password);
        await this.page.click('button[type="submit"]');
        await this.page.waitForNavigation({
          waitUntil: "networkidle2",
        });
      };
      // get the requestverificationtoken header and cookies
      await this.refreshRequestVfToken(simulateLogin);
      await this.refreshCookie();
      return this.getCookie();
    } catch (err) {
      throw new Error(err);
    }
  }

  /**
   * Safely logs the user out of their session
   */
  async logout() {
    // close page and browser instances
    this.page &&
      this.cookie &&
      (await this.page.goto(webadvisor.logout)) &&
      (await this.page.waitForNavigation({
        waitUntil: "networkidle2",
      }));
    await this.page.waitForTimeout(2000);
    // this.page && this.cookie && (await this.page.click("#logOff")); // log off
    this.page && (await this.page.close());
    this.browser && (await this.browser.close());
  }
}

module.exports = CookieManager;
