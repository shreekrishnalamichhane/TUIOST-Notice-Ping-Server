const helpers = require("./helpers/helpers");

(async () => {
    await helpers.initPing("Ping Server Initialized")
    await helpers.job()
})()
