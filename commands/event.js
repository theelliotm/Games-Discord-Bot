//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Bot = require("../bot");
const GameJS = require('./play')

const cooldown = 4000;
var cooldownPlayers = new Discord.Collection();

/**
 * Tells the player the response time
 * @param {*} bot The bot client.
 * @param {*} msg The command message.
 */
module.exports.run = async (bot, msg, args, guildData) => {
    let option = args[0] ? args[0].toLowerCase() : null;
    let hasEvent = (guildData.eventID && guildData.eventName);

    let embed = new Discord.MessageEmbed();
    embed.setColor("PURPLE");

    if (cooldownPlayers.has(msg.author.id) && (new Date().getTime() - cooldownPlayers.get(msg.author.id)) < cooldown) {
        msg.channel.send("⌚ Please wait `" + Math.ceil((cooldown - (new Date().getTime() - cooldownPlayers.get(msg.author.id))) / 1000) + " seconds` and try again.").then(msg2 => msg2.delete({ timeout: 10000 }));
        return;
    }

    cooldownPlayers.set(msg.author.id, new Date().getTime());

    if (!option || option === "info") {
        embed.setTimestamp();
        embed.setTitle(hasEvent ? "Event \'" + guildData.eventName + "\' Info" : "No Event Currently!")
        embed.setDescription((hasEvent ? (guildData.eventPaused ? "To unpause the event: `" + guildData.prefix + "event start`" +
            "\nTo end the event: `" + guildData.prefix + "event end`" : "To pause the event: `" + guildData.prefix + "event pause`") + "\nTo view the leaderboard: `g!leaderboard (e)vent`"
            : "To start an event: `" + guildData.prefix + "event start`"))
        if (hasEvent) {
            embed.addField("Status", guildData.eventPaused ? "Paused" : "Active", true);

            let gameTotal;
            try {
                gameTotal = await this.getEventGameCount(msg.guild.id, guildData.eventID, guildData.eventGame);
            } catch (e) {
                console.log(e);
                gameTotal = "❌ Error";
            }

            embed.addField("Total Games", gameTotal, true);
        }
        if (guildData.eventGame)
            embed.addField("Game Type", guildData.eventGame.charAt(0).toUpperCase() + guildData.eventGame.slice(1), true);
        msg.channel.send(embed);

    } else if (option === "start") {
        if (hasEvent) {
            if (guildData.eventPaused) {
                Bot.query(`UPDATE guilds SET event_paused = 0 WHERE event_id = ?;`, [guildData.eventID], async (err) => {
                    if (err)
                        msg.channel.send("❌ Sorry, an error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                    else
                        msg.channel.send("✅ Event unpaused.");
                    Bot.fetchCachedData(msg.guild.id, true);
                });
            } else {
                msg.channel.send("❌ You already have an event running. End it first (`" + guildData.prefix + "event end`).").then(msg2 => msg2.delete({ timeout: 10000 }));
                return;
            }
        } else {
            let name, game, state = 0;
            msg.channel.send("Lets begin! 🤔 What should the event be called?");
            let collector = msg.channel.createMessageCollector(m => m.author.id === msg.author.id, { time: 120000 });
            collector.on('collect', collected => {
                if (state === 0) {
                    name = collected.cleanContent;
                    if (name.length > 20) {
                        msg.channel.send("❌ Too long. Maximum of 20 characters.").then(msg2 => msg2.delete({ timeout: 10000 }));
                        name = null;
                    } else {
                        collector.options.time = 60000;
                        msg.channel.send("👍 Great choice! 🤔 Should the **" + name + "** event be exclusive to a certain game? \n Respond (Y)es or (N)o.");
                        state = 1;
                    }
                } else if (state === 1) {
                    const temp = collected.cleanContent.toLowerCase();
                    if (temp === "y" || temp === "yes") {
                        collector.options.time = 60000;
                        msg.channel.send("Alrighty! 🤔 What game?");
                        state = 2;
                    } else if (temp === "n" || temp === "no") {
                        this.startEvent(msg.guild.id, name, game, msg.channel);
                        game = "none";
                        collector.stop();
                        return;
                    }
                } else if (state === 2) {
                    game = collected.cleanContent.toLowerCase();
                    const idx = GameJS.vars.availableGames.map(m => m.name.toLowerCase()).indexOf(game);
                    if (idx > -1) {
                        this.startEvent(msg.guild.id, name, game, msg.channel);
                        collector.stop();
                        return;
                    } else {
                        msg.channel.send("❌ That game does not exist.").then(msg2 => msg2.delete({ timeout: 10000 }));
                        game = null;
                    }
                }
            });

            collector.on('end', collected => {
                if ((state === 0 && !name) || ((state === 2 || state === 1) && !game)) msg.channel.send("❌ Took too long, ended event creation wizard.").then(msg2 => msg2.delete({ timeout: 10000 }));
            });
        }
    } else if (option === "pause" || option === "stop") {
        if (hasEvent) {
            if (!guildData.eventPaused) {
                Bot.query(`UPDATE guilds SET event_paused = 1 WHERE event_id = ?;`, [guildData.eventID], async (err) => {
                    if (err)
                        msg.channel.send("❌ Sorry, an error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                    else
                        msg.channel.send("✅ Event paused. To unpause it, run `" + guildData.prefix + "event start`.");
                    Bot.fetchCachedData(msg.guild.id, true);
                });
            } else {
                msg.channel.send("❌ Game is already paused. To unpause, run `" + guildData.prefix + "event start`.").then(msg2 => msg2.delete({ timeout: 10000 }));
                return;
            }
        } else {
            msg.channel.send("❌ No event to " + option + "!").then(msg2 => msg2.delete({ timeout: 10000 }));
            return;
        }
    } else if (option === "end") {
        if (hasEvent) {
            Bot.query(`UPDATE guilds SET event_name = ?, event_id = ?, event_paused = 0, event_game = ? WHERE event_id = ?;`, [null, null, null, guildData.eventID], async (err) => {
                if (err)
                    msg.channel.send("❌ Sorry, an error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                else
                    msg.channel.send("✅ Event ended. To start a new one, run `" + guildData.prefix + "event start`.");
                Bot.fetchCachedData(msg.guild.id, true);
            });
        } else {
            msg.channel.send("❌ No event to end!").then(msg2 => msg2.delete({ timeout: 10000 }));
            return;
        }
    } else if (option === "reset") {
        if (hasEvent) {
            Bot.query(`UPDATE guilds SET event_id = ? WHERE event_id = ?;`, [Bot.generate(10), guildData.eventID], async (err) => {
                if (err)
                    msg.channel.send("❌ Sorry, an error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                else
                    msg.channel.send("✅ Event reset." + (guildData.eventPaused ? "To unpause it, run `" + guildData.prefix + "event start`." : ""));
                Bot.fetchCachedData(msg.guild.id, true);
            });
        } else {
            msg.channel.send("❌ No event to reset!").then(msg2 => msg2.delete({ timeout: 10000 }));
            return;
        }
    }
}

/**
 * Starts an event with the name and gametype for the guild
 * @param {String} guildID 
 * @param {String} gameName 
 * @param {String} gameType 
 */
module.exports.startEvent = async (guildID, gameName, gameType, channel) => {
    if (Bot.fetchCachedData(guildID, false).gameID != null) {
        channel.send("❌ Akward... an event has already been started.");
        return;
    }

    Bot.query(`UPDATE guilds SET event_name = ?, event_id = ?, event_paused = 0, event_game = ? WHERE id = ?;`, [gameName, Bot.generate(10), gameType ? gameType : null, guildID], async (err) => {
        if (err)
            channel.send("❌ Sorry, an error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
        else
            channel.send("🚀 Your event is blasting off!");
        Bot.fetchCachedData(guildID, true);
    });
}

/**
 * Gets the amount of games a guild's event has had so far.
 * @param {*} guildID ID of the server
 * @param {*} eventID ID of the event
 */
module.exports.getEventGameCount = async (guildID, eventID, gameType) => {
    return new Promise(function (resolve, reject) {
        if (!eventID || !guildID) reject();
        Bot.query(`SELECT COUNT(event_id) AS gameCount FROM games WHERE guild_id = ? AND event_id = ?` + (gameType ? ` AND game_type = ?` : ``) + `;`, [guildID, eventID, gameType], async (err, rows) => {
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
