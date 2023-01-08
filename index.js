/**
 * By inspecting the GET response for https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans
 * we can see several endpoints for which we can obtain data under lines 2500
 * In order to get the current users "planned" and unregistered courses,
 * we'll have to navigate to /Student/Planning/DegreePlans/CurrentAsync and
 * inspect the JSON accordingly
 */
const process = require("process");
const { parse } = require("node-html-parser");
const CookieManager = require("./src/CookieManager");
const handleExit = require("./src/helpers/handleExit");
const { registerWithAxios, sleep, getDegreePlan } = require("./src/helpers/utils");
const { studentId, term } = require("./src/config");

const main = async () => {
  // prepare to scrape and setup exit handlers
  let cookieManager = new CookieManager();
  let requestControllers = [];
  
  try {
    // setup exit handlers
    await handleExit(cookieManager, requestControllers);

    // launch puppeteer and get the cookies + vft
    await cookieManager.fetchCookie();

    // get the cookies and requestVFT to prepare to
    // make requests
    let cookie = cookieManager.getCookie();
    let verificationToken = cookieManager.getRequestVerificationToken();
    if (!cookie) {
      throw new Error("no cookie");
    }
    if (!verificationToken) {
      throw new Error("no verification token");
    }

    // get the users degree plan for courses to be registered
    const degreePlan = await cookieManager.fetchDegreePlan();
    if (!degreePlan){
      throw new Error("no degree plan was found");
    }

    process.send("ready");

    // attempt to loop until course has been registered
    let data = null; // holds the response data
    // refresh function
    const refresh = async () => {
      await cookieManager.logout();
      cookieManager = new CookieManager();
      await cookieManager.fetchCookie();
      await sleep(3000);
    }

    do {
      // before making requests, ensure abortControllers are attached to cancel the mid-way (axios)
      const controller = new AbortController();
      requestControllers.push(controller);

      // register with VFT, cookie, object with student Id and courses, and catch with controller
      const res = await registerWithAxios(verificationToken, cookie, {
        sectionRegistrations: cookieManager.getSectionsToRegister(),
        sId: cookieManager.getStudentId()
        }, controller);
      data = res.data; // when succesful
      // if and when our cookie/requestVFT expires, we should create a new session
      // and utilize those sessions cookies and vft
      if (data["InvalidSession"]){
        console.log("refreshing...");
        await refresh();
        console.log("refreshed successfully");
        cookie = cookieManager.getCookie();
        verificationToken = cookieManager.getRequestVerificationToken();
        continue;
      }
      const htmlResponse = parse(data);
      if (htmlResponse.childNodes.length == 1){ // not sure why, but 1 results in only nothing being parsed
        console.log("received: ", JSON.stringify(data));
      }
      await sleep(1500);
    } while (data.length > 0);
  } catch (err) {
    if ((err.code && err.code != "ERR_CANCELED")) {
      console.error(new Date().toString(), err);
    }
  } finally {
    await cookieManager.logout();
    process.exit(0);
  }
};

main();
