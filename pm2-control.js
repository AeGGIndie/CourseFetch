const pm2 = require("pm2");

pm2.connect((err) => {
    if (err) {
        console.error(err)
        process.exit(2)
    }

    // start the script using the options from this file
  pm2.start("./ecosystem.config.js" ,function (err, apps) {
        if (err) {
            console.error(err)
            return pm2.disconnect()
        }
        // Disconnects from PM2
        pm2.disconnect();
    });
});