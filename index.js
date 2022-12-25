/**
 * By inspecting the GET response for https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans
 * we can see several endpoints for which we can obtain data under lines 2500
 * In order to get the current users "planned" and unregistered courses,
 * we'll have to navigate to /Student/Planning/DegreePlans/CurrentAsync and
 * inspect the JSON accordingly
 */
const process = require("process");
const CookieManager = require("./src/CookieManager");
const handleExit = require("./src/helpers/handleExit");
const { registerWithAxios, sleep, getDegreePlan } = require("./src/helpers/utils");

(async () => {
  // prepare to scrape and setup exit handlers
  let cookieManager = new CookieManager();
  let requestControllers = [];
  
  try {
    // setup exit handlers
    await handleExit(cookieManager, requestControllers);

    // setup for user variables (should be changed to config)
    const termToRegister = "W23";
    const studentId = process.env.STUDENT_ID;

    // launch puppeteer and get the cookies + vft
    await cookieManager.fetchCookie();
    process.send("ready");

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
    const degreeResponse = await getDegreePlan(verificationToken, cookie);
    const { DegreePlan } = degreeResponse.data;

    // get the current study term we want to register for
    const registerTerm = DegreePlan["Terms"].find(term => term["Code"] === termToRegister);
    const coursesToRegister = registerTerm["PlannedCourses"].filter(course => !course["Ispreregistered"] && !course["HasRegisteredSection"]);
    const coursePayload = coursesToRegister.map(course => {
        return {
            SectionId: course["Section"]["Id"],
            Credits: course["Credits"],
            Action: "Add",
            DropReasonCode: null,
            IntentToWithdrawId: null,
        }
    });
    // actual data payload to be sent in our request
    const sectionPayload = {
        sectionRegistrations: coursePayload,
        studentId,
    };

    // attempt to loop until course has been registered
    let data = null; // holds the response data


    do {
      const controller = new AbortController();
      requestControllers.push(controller);
      const res = await registerWithAxios(verificationToken, cookie, sectionPayload, controller);
      data = res.data;
      // if and when our cookie/requestVFT expires, we should create a new session
      // and utilize those sessions cookies and vft
      if (data["InvalidSession"]){
        console.log("refreshing...");
        await cookieManager.logout();
        cookieManager = new CookieManager();
        await cookieManager.fetchCookie();
        await sleep(3000);
        console.log("refreshed successfully");
        cookie = cookieManager.getCookie();
        verificationToken = cookieManager.getRequestVerificationToken();

        continue;
      }
      console.log(data);
      await sleep(1500);
    } while (data.length > 0);
  } catch (err) {
    console.error(new Date().toString(), err);
  } finally {
    await cookieManager.logout();
    process.exit(0);
  }
})();
