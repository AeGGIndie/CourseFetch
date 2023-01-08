const pm2 = require("pm2");

// listen for forceStop events
pm2.launchBus((err, pm2_bus) => {
    pm2_bus.on('process:forceStop', (packet) => {
        // stop application
        pm2.stop("app", (err) => {
            if (err) {
                console.error(err);
                process.exit(2);
            }
            // received payload
            console.log(packet);
        });
    })
});

pm2.connect((err) => {
    if (err) {
        console.error(err)
        process.exit(2)
    }

    // start the script using the options from this file
    pm2.start("./ecosystem.config.js", function (err, apps) {
        if (err) {
            console.error(err)
            return pm2.disconnect()
        }
        // Disconnects from PM2
        return pm2.disconnect();
    });
});