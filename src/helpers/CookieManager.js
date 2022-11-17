const puppeteer = require("puppeteer-extra");
const { executablePath } = require("puppeteer");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
const UserAgent = require("user-agents");
const _ = require("lodash");
require("dotenv").config();

// configuring puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

class CookieManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.cookie = null;
    this.requestVerificationToken = null;
  }

  // getter
  getCookie() {
    return this.cookie;
  }

  // setter
  setCookie(cookie) {
    this.cookie = cookie;
  }

  getPage() {
    return this.page;
  }

  getRequestVerificationToken() {
    return this.requestVerificationToken;
  }

  async open() {
    try {
      this.browser = await puppeteer.launch({
        handleSIGINT: false,
        args: ["--window-size=1920,1080"],
        headless: process.env.NODE_ENV === "PROD",
        executablePath: executablePath(),
      });

      this.page = await this.browser.newPage();
    } catch (err) {
      throw new Error(err);
    }
  }

  async fetchCookie() {
    try {
      // create a new browser
      this.browser = await puppeteer.launch({
        handleSIGINT: false,
        args: ["--window-size=1920,1080"],
        headless: process.env.NODE_ENV === "PROD",
        executablePath: executablePath(),
      });

      // go to the login page from webadvisor
      this.page = await this.browser.newPage();
      await this.page.setDefaultNavigationTimeout(0);
      await this.page.setUserAgent(new UserAgent().toString());
      await this.page.goto(process.env.WEBADVISOR_LOGIN_PAGE);

      // wait until login has been loaded on screen
      await this.page.waitForSelector(".form-horizontal");
      await this.page.type("#inputUsername", process.env.USERNAME);
      await this.page.type("#inputPassword", process.env.PASSWORD);
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({
        waitUntil: "networkidle0",
      });

      // get the cookies once we've logged in, joining all of them into a string
      this.setCookie(
        _.join(
          _.map(await this.page.cookies(), ({ name, value }) =>
            _.join([name, value], "=")
          ),
          "; "
        )
      );

      const requestVerificationToken = _.filter(
        await this.page.cookies(),
        ({ name, value }) => {
          console.log(name, value);
          if (name === "__RequestVerificationToken_L1N0dWRlbnQ1") {
            return true;
          }
          return false;
        }
      );
      this.requestVerificationToken =
        requestVerificationToken.length != 0
          ? requestVerificationToken[0]
          : null;
      return this.cookie;
    } catch (err) {
      throw new Error(err);
    }
  }

  async logout() {
    // close page and browser instances
    this.page &&
      this.cookie &&
      (await this.page.goto(
        "https://colleague-ss.uoguelph.ca/Student/Account/LogOff"
      )) &&
      (await this.page.waitForNavigation({
        waitUntil: "networkidle0",
      }));
    await this.page.waitForTimeout(2000);
    // this.page && this.cookie && (await this.page.click("#logOff")); // log off
    this.page && (await this.page.close());
    this.browser && (await this.browser.close());
  }
}

module.exports = CookieManager;
