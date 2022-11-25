const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const UserAgent = require("user-agents");
const _ = require("lodash");
const { username, password, webadvisor } = require("./config");
const { sleep } = require("./helpers/utils");

// configuring puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class CookieManager {
  // private
  #browser = null;
  #browserOptions = null;
  #cdpSession = null;
  #cdpRequestDataRaw = null;
  #requestVerificationToken = null;
  #cookie = null;

  // public
  page = null;

  constructor() {
    this.#browser = null;
    this.#cookie = null;
    this.#requestVerificationToken = null;
    this.#browserOptions = {
      handleSIGINT: false, // manually handle
      args: ["--window-size=1920,1080"],
      headless: process.env.NODE_ENV === "PROD",
      executablePath: executablePath(),
      // ignoreDefaultArgs: ['--disable-extensions'],
    };
    this.#cdpSession = null;
    this.#cdpRequestDataRaw = null;
    this.page = null;
  }

  // get for cookie
  getCookie() {
    return this.#cookie;
  }

  // set for cookie
  setCookie(cookie) {
    this.#cookie = cookie;
  }

  // get for page object
  getPage() {
    return this.page;
  }

  // get for request verification token
  getRequestVerificationToken() {
    return this.#requestVerificationToken;
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
    const requestExtracted = this.#cdpRequestDataRaw
      .reverse()
      .find((requestData) => {
        if (!requestData){
            return false;
        }
        if (!requestData.request) {
          return false;
        }
        if (!requestData.request.headers) {
          return false;
        }

        return "__RequestVerificationToken" in requestData.request.headers
          ? requestData.request.headers["__RequestVerificationToken"]
          : false;
      });
    this.#requestVerificationToken =
      requestExtracted.request.headers["__RequestVerificationToken"];
    return true;
  }

  // deprecated for now
  // refreshes the current user session to continue making requests (request verification token + cookie)
  //
  async refreshSession() {
    await this.#browser.close();
    await sleep(3000);
    await this.fetchCookie();
  }

  async simulateLogin(){
      await this.page.waitForSelector(".form-horizontal");
      await this.page.type("#inputUsername", username);
      await this.page.type("#inputPassword", password);
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({
        waitUntil: "networkidle0",
      });
  }

  /**
   * Mainly used for debugging and developing, hence the long wait time
   */
  async open() {
    try {
      this.#browser = await puppeteer.launch(this.#browserOptions);
      this.page = await this.#browser.newPage();
       this.page.waitForTimeout(300 * 1000);
    } catch (err) {
      throw new Error(err);
    }
  }

  // Returns map of request ID to raw CDP request data. This will be populated as requests are made.
  // taken from https://stackoverflow.com/questions/47078655/missing-request-headers-in-puppeteer/62232903#62232903
  // and https://github.com/puppeteer/puppeteer/issues/5364
  async setupLoggingOfAllNetworkData() {
    this.#cdpSession = await this.page.target().createCDPSession();
    await this.#cdpSession.send("Network.enable");
    const cdpRequestDataRaw = [];
    const addCDPRequestDataListener = (eventName) => {
      this.#cdpSession.on(eventName, (request) => {
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

  /**
   * Starts puppeteer navigating to the register endpoint, handling login
   * and getting all verification tokens/cookies required. Should only be called once
   * per script to create one instance of the manager.
   */
  async fetchCookie() {
    try {
      // create a new browser
      this.#browser = await puppeteer.launch(this.#browserOptions);

      // go to the login page from webadvisor
      this.page = await this.#browser.newPage();
      this.#cdpRequestDataRaw = await this.setupLoggingOfAllNetworkData();
      await this.page.setDefaultNavigationTimeout(0);
      await this.page.setUserAgent(new UserAgent().toString());
      await this.page.goto(webadvisor.register);

      // get the requestverificationtoken header and cookies
      await this.refreshRequestVfToken(async () => {
          await this.simulateLogin();
      });
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
      this.#cookie &&
      (await this.page.goto(webadvisor.logout)) &&
      (await this.page.waitForNavigation({
        waitUntil: "networkidle2",
      }));
    await this.page.waitForTimeout(2000);
    this.page && (await this.page.close());
    this.#browser && (await this.#browser.close());
  }
}

module.exports = CookieManager;
