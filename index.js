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
// sigint handler
process.on("SIGINT", exitPuppeteer);


// refresh page function
async function refreshRandom(page){
  await page.goto(webadvisor.home, { timeout: 0, waitUntil: "networkidle2" });
  await page.waitForTimeout(5000); // stay for around 5 seconds then leave
  await page.goto(webadvisor.register, { timeout: 0, waitUntil: "networkidle2" });
}


const getSchedule = () => {
  const scheduleNode = document.getElementById("schedule-activeterm-text");
  return scheduleNode ? scheduleNode.innerHTML : null;
}
const getCourses = (courseTitlesList) => {
  if (courseTitlesList == null){
    return [];
  }
  return courseTitlesList.map(course => course.textContent);
};
const sleep = async (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
}

(async () => {
  try {    
    await cookieManager.fetchCookie();
    const page = cookieManager.getPage();
    await page.setDefaultNavigationTimeout(0);
    await page.waitForSelector("#schedule-next-term");
    const cookie = cookieManager.getCookie();
    let verificationToken = cookieManager.getRequestVerificationToken();
    const res = await page.evaluate( async (verificationToken, cookie) => {
      return await new Promise(resolve => {
        resolve(fetch("https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans/RegisterSections", {
          "headers": {
            "__requestverificationtoken": verificationToken,
            "accept-language": "en-US,en;q=0.8",
            "content-type": "application/json, charset=UTF-8",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1",
            "x-requested-with": "XMLHttpRequest",
            "cookie": cookie,
            "Referer": "https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans?hideProxyDialog=false",
            "Referrer-Policy": "strict-origin-when-cross-origin"
          },
          "body": "{\"sectionRegistrations\":[{\"SectionId\":\"181965\",\"Credits\":0.5,\"Action\":\"Add\",\"DropReasonCode\":null,\"IntentToWithdrawId\":null}],\"studentId\":\"1134487\"}",
          "method": "POST"
        }));
      }) 
    }, verificationToken, cookie);
    console.log(res, verificationToken, cookie);
    
    // __requestverificationtoken cookie is different from the header
    // so instead we want to get the header

    /*
    let refreshAttempts = 0;
    const maxAttempts = 40;
    let messages = null;

    do {
      // in order to keep the session, we navigate to a different
      // route on the authenticated app
      if (refreshAttempts >= maxAttempts){
          await refreshRandom(page);
          // reset the amount of attempts before a refresh
          refreshAttempts = 0;
      }

      
      let currentTerm = await page.evaluate(getSchedule);

      // get to the current term we want to register
      while (currentTerm != "Winter 2023") {
        console.log(currentTerm, new Date());
        await page.waitForSelector("#schedule-next-term");
        // get the current courses on the current semester
        // let prevCourses = page.$$eval(".schedule-listitem-header-title", getCourses);
        await page.click("#schedule-next-term"); // click next term
        await sleep(5000);
        // wait for the courses to have been updated
        // let currentCourses = page.$$eval(".schedule-listitem-header-title", getCourses);
        // while (!prevCourses.includes(currentCourses[0])){
        //   sleep(1000);
        //   currentCourses = page.$$eval(".schedule-listitem-header-title", getCourses);
        // }
        // console.log(prevCourses, currentCourses);

        currentTerm = await page.evaluate(getSchedule);

        // edge case where term fails to get the inner HTML
        if (!currentTerm){
          // refresh the page and repeat the loop
          await refreshRandom(page);
          continue;
        }
      }

      // get the button without disabled property (regardless if it exists or not)
      await page.$eval("#register-button", (btn) =>
        btn.removeAttribute("disabled")
      );
      await page.$eval("#register-button", (btn) => btn.click());
      await page.waitForSelector("#notification-messages-list", {
        visible: true,
        timeout: 30 * 1000, // we want to time it out if it never pops up
      });

      // get the notifications messages
      messages = await page.$$eval(".esg-alert__message-text", (alerts) => {
        if (alerts == null){
          return null;
        }
        return alerts.map((alert) => alert.textContent);
        
      });
      console.log(messages);

      // reset
      await page.click("#notificationMenu");
      await page.waitForSelector("#notification-messages-list", {
        visible: false,
        timeout: 0,
      });
      refreshAttempts++;
    } while(messages.length > 0)
    */
  } catch (err) {
    console.error(new Date().toString(), err);
  } finally {
    await cookieManager.logout();
    process.exit(0);
  }
})();
