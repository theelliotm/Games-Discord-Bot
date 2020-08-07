//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");

const cooldown = 4000;
var cooldownPlayers = new Discord.Collection();

/**
 * Tells the player the response time
 * @param {*} bot The bot client.
 * @param {*} msg The command message.
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
    let option = args[0] ? args[0].toLowerCase() : null; 
    let hasEvent = (guildData.eventID && guildData.eventName);

    let embed = new Discord.MessageEmbed();
    embed.setColor("PURPLE");

    if(cooldownPlayers.has(msg.author.id) && (new Date().getTime() - cooldownPlayers.get(msg.author.id)) < cooldown){
        msg.channel.send("⌚ Please wait `" +  Math.ceil((cooldown - (new Date().getTime() - cooldownPlayers.get(msg.author.id))) / 1000) + " seconds` and try again.").then(msg2 => msg2.delete({ timeout: 10000 }));
        return;
    }

    cooldownPlayers.set(msg.author.id, new Date().getTime());

    if(!option || option === "info"){

            embed.setTitle(hasEvent ? "Event \'" + guildData.eventName +  "\' Info" : "No Event Currently!")
            embed.setDescription(hasEvent ? (guildData.eventPaused ? "To restart the event: `" + guildData.prefix + "event start`" : "To pause the event: `" + guildData.prefix + "event pause`") + "\nTo reset the event: `" + guildData.prefix + "event reset`" : "To start an event: `" + guildData.prefix + "event start`");
            if(hasEvent){ 
                embed.addField("Status", guildData.eventPaused ? "Paused" : "Active", true);

                let gameTotal;
                try {
                    gameTotal = await this.getEventGameCount(con, msg.guild.id, guildData.eventID, guildData.eventGame);
                } catch (e){
                    console.log(e);
                    gameTotal = "❌ Error";
                }

                embed.addField("Total Games", gameTotal, true);
            }
            msg.channel.send(embed);

    } else if (option === "start") {

    } else if (option === "pause" || option === "stop") {

    } else if (option === "reset") {

    } else if (option === "rename") {

    }
}

/**
 * Gets the amount of games a guild's event has had so far.
 * @param {*} con Database connection
 * @param {*} guildID ID of the server
 * @param {*} eventID ID of the event
 */
module.exports.getEventGameCount = async (con, guildID, eventID, gameType) => {
    return new Promise(function (resolve, reject) {
        if(!eventID || !guildID || !con) reject();
        con.query(`SELECT COUNT(event_id) AS gameCount FROM games WHERE guild_id = ? AND event_id = ?` + (gameType ? ` AND game_type = ?` : ``) + `;`, [guildID, eventID, gameType], async (err, rows) => {
            if (err || rows.length < 1) 
                reject();
            else
                resolve(rows[0].gameCount);
        });
    });
}

module.exports.info = {
    name: "event",
    adminOnly: true
}
