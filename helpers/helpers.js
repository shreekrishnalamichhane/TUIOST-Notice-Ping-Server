const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config()
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const { exit } = require('process');

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const LOOKUP_URL = process.env.LOOKUP_URL;
const LOOKUP_INTERVAL = process.env.LOOKUP_INTERVAL || 30000;
const SHORTURL_API = process.env.SHORTURL_API;
const SHORTURL_API_KEY = process.env.SHORTURL_API_KEY;
const SHORTURL_API_DOMAIN_ID = process.env.SHORTURL_API_DOMAIN_ID;
const SHORTURL_SPACE_ID = process.env.SHORTURL_SPACE_ID;

const hook = new Webhook(DISCORD_WEBHOOK);

let helpers = {
    existsFile: (path) => {
        try {
            const data = fs.existsSync(path, 'utf8')
            return data
        } catch (err) {
            console.error("Read File Error : ", err)
            return false
        }
    },
    readFile: (path) => {
        try {
            const data = fs.readFileSync(path, 'utf8')
            return JSON.parse(data)
        } catch (err) {
            console.error("Read File Error : ", err)
            return false
        }
    },
    writeFile: (path, content) => {
        try {
            fs.writeFileSync(path, JSON.stringify(content));
            return true
        } catch (err) {
            console.error("Write File Error : ", err)
            return false
        }
    },
    appendFile: (path, newContent) => {
        try {
            fs.appendFileSync(path, newContent);
            return true
        } catch (err) {
            console.error("Append File Error : ", err)
            return false
        }
    },
    fetchData: async (type = "notice") => {
        try {
            helpers.log('Fetch Started : ' + type)
            const res = await axios.get(process.env.LOOKUP_URL + type);
            helpers.log('Fetch Completed : ' + type)
            return res.data
        } catch (err) {
            console.log("Fetch Data Error : ", err)
            return false
        }
    },
    generateShortURL: async (url) => {
        const shortUrl = await axios.post(SHORTURL_API + "links", { url, domain_id: SHORTURL_API_DOMAIN_ID, space_id: SHORTURL_SPACE_ID }, {
            headers: {
                Authorization: `Bearer ${SHORTURL_API_KEY}`
            }
        });

        return shortUrl.data.data.short_url;
    },
    pingDiscord: async (title, description, url, type) => {
        const shortUrl = await helpers.generateShortURL(url);
        const date = moment().format('dddd, MMM Do YYYY, hh:mm:ss A');

        const embed = new MessageBuilder()
            .setText("@everyone")
            .setTitle(title)
            .setAuthor('TUIOST', 'https://www.tuiost.edu.np/favicon/apple-icon-180x180.png', 'https://www.tuiost.edu.np/')
            .setURL(shortUrl)
            .addField('Author:', '[TUIOST](https://iost.tu.edu.np)')
            .addField('Notice Link:', shortUrl)
            .addField('Type:', type.toUpperCase())
            .addField('Published At:', date)
            .setColor('#f48200')
            .setThumbnail('https://www.tuiost.edu.np/favicon/apple-icon-180x180.png')
            .setDescription(description)
            // .setImage('https://cdn.discordapp.com/embed/avatars/0.png')
            .setTimestamp()
            .setFooter('Plugin By : uniksk ', 'https://cdn.discordapp.com/embed/avatars/0.png')
        return await hook.send(embed);
    },
    diffArray: (A, B) => {
        return A.filter(a => !B.map(b => b.hash).includes(a.hash))
    },
    dispatcher: (data, type, delay = 2000) => {
        helpers.log(type + ' , Count : ' + data.length)
        data.reverse().forEach(async d => {
            helpers.log('Title : ' + d.title)
            await helpers.pingDiscord(d.title, "", d.link, type)
        })
    },
    cacheHit: (type, newData, oldData) => {
        let data = helpers.diffArray(newData, oldData)
        if (data.length > 0) {
            helpers.writeFile('./cache/' + type + '.json', newData)
            helpers.log("Cache Overwrite : " + type)
        }
        helpers.dispatcher(data, type)
    },
    cacheMiss: (type, data) => {
        if (helpers.writeFile('./cache/' + type + '.json', data)) {
            helpers.log("New Cache Write : " + type)
            helpers.dispatcher(data, type)
        }
    },
    watch: async (type) => {
        const data = await helpers.fetchData(type)
        if (data.success && data.statusCode) {
            const cache = helpers.existsFile("./cache/" + type + ".json") && helpers.readFile("./cache/" + type + ".json")
            if (cache) {
                try {
                    helpers.cacheHit(type, data.data, cache)
                }
                catch (err) {
                    helpers.log("Unable to parse the cache" + err)
                    helpers.cacheMiss(type, data.data)
                }
            } else {
                helpers.cacheMiss(type, data.data)
            }
        }
    },
    job: async () => {
        await helpers.watch('notice')
        helpers.log('>>> TimeOut : ' + (process.env.LOOKUP_INTERVAL || 300000) / 1000 / 60 + " minutes")
        setTimeout(helpers.job, process.env.LOOKUP_INTERVAL || 300000) // Default is 5 minutes
    },
    log: async (message) => {
        const date = moment().format('dddd, MMM Do YYYY, hh:mm:ss A');
        let msg = "[" + date + "] " + message;
        helpers.appendFile('./log/log', msg + "\n")
        console.log(msg);
    },
    initPing: async (message = "Ping Server Initialized..") => {
        await hook.send(message)
    },
    testCreds: async () => {
        if (!DISCORD_WEBHOOK || !LOOKUP_URL || !LOOKUP_INTERVAL || !SHORTURL_API || !SHORTURL_API_KEY || !SHORTURL_API_DOMAIN_ID || !SHORTURL_SPACE_ID) {
            console.log("Please provide all the required credentials in .env file");
            helpers.log("Please provide all the required credentials in .env file");
            await helpers.initPing("Please provide all the required credentials in .env file");
            exit(1);
        }
    }
}

module.exports = helpers
