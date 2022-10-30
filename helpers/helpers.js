const fs = require('fs');
const axios = require('axios');
require('dotenv').config()
const { Webhook, MessageBuilder } = require('discord-webhook-node');

const hook = new Webhook(process.env.DISCORD_WEBHOOK);

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

let helpers = {
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
    fetchData: async (type = "notice") => {
        try {
            const res = await axios.get(process.env.LOOKUP_URL + "watch/" + type);
            return res.data
        } catch (err) {
            console.log("Fetch Data Error : ", err)
            return false
        }
    },
    twoDigit: (n) => {
        return (n < 10) ? "0" + n : n;
    },
    from0To12: (n) => {
        return n == 0 ? 12 : n
    },
    AMPM: (n) => {
        return n < 12 ? "AM" : "PM"
    },
    pingDiscord: async (title, description, url, type) => {
        const d = new Date()
        let date = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear()
            + " " + ((d.getHours() > 12) ? helpers.twoDigit(helpers.from0To12(d.getHours() - 12)) : helpers.twoDigit(helpers.from0To12(d.getHours())))
            + ":" + helpers.twoDigit(d.getMinutes()) + " " + helpers.AMPM(d.getHours())

        await hook.send("@everyone New Event")
        const embed = new MessageBuilder()
            .setTitle(title)
            .setAuthor('TUIOST', 'https://www.tuiost.edu.np/favicon/apple-icon-180x180.png', 'https://www.tuiost.edu.np/')
            .setURL(url)
            .addField('Author:', '[TUIOST](https://tuiost.edu.np)')
            .addField('Notice Link:', '[Click here](' + url + ')')
            .addField('Type:', type.toUpperCase())
            .addField('Published At:', date)
            .setColor('#f48200')
            .setThumbnail('https://www.tuiost.edu.np/favicon/apple-icon-180x180.png')
            .setDescription(description)
            // .setImage('https://cdn.discordapp.com/embed/avatars/0.png')
            .setTimestamp()
            .setFooter('Plugin By : uniksk#2391 ', 'https://cdn.discordapp.com/embed/avatars/0.png')
        return await hook.send(embed);
    },
    diffArray: (A, B) => {
        return A.filter(a => !B.map(b => b.hash).includes(a.hash))
    },
    dispatcher: (data, type, delay = 2000) => {
        data.reverse().forEach(d => {
            console.log(d)
            helpers.pingDiscord(d.title, "", d.link, type)
        })
    },
    cacheHit: (type, newData, oldData) => {
        let data = helpers.diffArray(newData, oldData)
        helpers.dispatcher(data, type)
    },
    cacheMiss: (type, data) => {
        if (helpers.writeFile('./cache/' + type + '.json', data)) {
            helpers.dispatcher(data, type)
        }
    },
    watch: async (type) => {
        const data = await helpers.fetchData(type)
        if (data.success && data.statusCode) {
            const cache = helpers.readFile("./cache/" + type + ".json")
            if (cache) {
                try {
                    helpers.cacheHit(type, data.data, cache)
                }
                catch (err) {
                    console.log("Unable to parse the cache", err)
                    helpers.cacheMiss(type, data.data)
                }
            } else {
                helpers.cacheMiss(type, data.data)
            }
        }
    },
    job: async () => {
        setInterval(async () => {
            await helpers.watch('notice')
            await helpers.watch('result')
            await helpers.watch('schedule')
            return true
        }, process.env.LOOKUP_INTERVAL || 60000)
    }
}

module.exports = helpers
