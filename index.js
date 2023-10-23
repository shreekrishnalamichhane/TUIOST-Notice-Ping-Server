const helpers = require("./helpers/helpers");

(async () => {
    await helpers.testCreds()
    await helpers.initPing("Ping Server Initialized")
    await helpers.job()
})()
