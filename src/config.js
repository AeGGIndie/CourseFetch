require("dotenv").config();

const config = {
    webadvisor: {
        baseURL: "https://colleague-ss.uoguelph.ca",
        ssoURL: "https://sso.identity.uoguelph.ca",
    },
    username: process.env.USER_NAME,
    password: process.env.PASSWORD,
    studentId: process.env.STUDENT_ID,
    term: process.env.TERM_TO_REGISTER,
}

config.webadvisor.home = config.webadvisor.baseURL + "/Student";
config.webadvisor.register = config.webadvisor.home + "/Planning/DegreePlans";
config.webadvisor.logout = config.webadvisor.home + "/Account/LogOff";
config.webadvisor.degreePlan = config.webadvisor.home + "/Planning/DegreePlans/CurrentAsync";
config.webadvisor.authFailed = config.webadvisor.ssoURL + "/oam/server/auth_cred_submit";

module.exports = config;
