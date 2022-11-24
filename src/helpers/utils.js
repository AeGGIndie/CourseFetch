const axios = require("axios");
const fetch = require("node-fetch");

const sleep = async (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const registerWithAxios = async (requestVFT, cookie) => {
  return await axios({
    method: "post",
    url: "https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans/RegisterSections",
    data: '{"sectionRegistrations":[{"SectionId":"181965","Credits":0.5,"Action":"Add","DropReasonCode":null,"IntentToWithdrawId":null}],"studentId":"1134487"}',
    headers: {
      __RequestVerificationToken: requestVFT,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      cookie: cookie,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json, charset=utf-8",
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://colleague-ss.uoguelph.ca",
      Connection: "keep-alive",
      Referer: "https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans",
    },
    withCredentials: true,
  });
};

const registerWithFetch = (requestVFT, cookie) => {
  const res = await fetch(
    "https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans/RegisterSections",
    {
      headers: {
        __requestverificationtoken: requestVFT,
        "accept-language": "en-US,en;q=0.8",
        "content-type": "application/json, charset=UTF-8",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-requested-with": "XMLHttpRequest",
        cookie: cookie,
        Referer:
          "https://colleague-ss.uoguelph.ca/Student/Planning/DegreePlans?hideProxyDialog=false",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: '{"sectionRegistrations":[{"SectionId":"181965","Credits":0.5,"Action":"Add","DropReasonCode":null,"IntentToWithdrawId":null}],"studentId":"1134487"}',
      method: "POST",
    }
  );
  if (res.ok) {
    return await res.json();
  }
  throw new Error("could not fetch successfully");
}

module.exports = { sleep, registerWithAxios, registerWithFetch };