require("dotenv").config();

const config = {
    webadvisor: {
        baseURL: "https://colleague-ss.uoguelph.ca",
    },
    username: process.env.USER_NAME,
    password: process.env.PASSWORD,
}

config.webadvisor.home = config.webadvisor.baseURL + "/Student";
config.webadvisor.register = config.webadvisor.home + "/Planning/DegreePlans";
config.webadvisor.logout = config.webadvisor.home + "/Account/LogOff";


module.exports = config;