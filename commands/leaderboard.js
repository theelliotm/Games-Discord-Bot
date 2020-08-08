//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Game = require("./play");
const Bot = require("../bot");

const cooldown = 7000;
var cooldownPlayers = new Discord.Collection();

/**
 * Creates a leaderboard embed and displays it to the user.
 * Leaderboards can be global or restricted to a server through the first argument.
 * Leaderboards can be optionally restricted to a specific game through the second argument.
 * Has a cooldown to limit database usage.
 * @param {*} bot The client user.
 * @param {*} msg The command message.
 * @param {*} args The arguments to further specify which leaderboard to display.
 * @param {*} guildData The cached guild data. (In this case, the prefix)
 */
module.exports.run = async (bot, msg, args, guildData) => {

    if (args.length == 0) {
        msg.channel.send("❌ Please specify what leaderboard. Options: `(g)lobal`, `(s)erver`, or `(e)vent`").then(msg2 => msg2.delete({ timeout: 7000 }));
        return;
    }

    let option = args[0].toLowerCase();
    args.splice(0, 1)
    let game = args.join(" ");

    if (game && !(Game.vars.availableGames.map(r => r.name.toLowerCase()).indexOf(game) > -1)) {
        msg.channel.send("❌ That game does not exist. To view all games, run the command `" + guildData.prefix + "games`").then(msg2 => msg2.delete({ timeout: 10000 }));
        return;
    }

    if(cooldownPlayers.has(msg.author.id) && (new Date().getTime() - cooldownPlayers.get(msg.author.id)) < cooldown){
        msg.channel.send("⌚ Please wait `" +  Math.ceil((cooldown - (new Date().getTime() - cooldownPlayers.get(msg.author.id))) / 1000) + " seconds` and try again.").then(msg2 => msg2.delete({ timeout: 10000 }));
        return;
    }
    
    if (option == "global" || option == "g") {

        cooldownPlayers.set(msg.author.id, new Date().getTime());

        Bot.query(`SELECT winner_id AS player, COUNT(*) AS wins FROM games WHERE winner_id IS NOT NULL` + (game ? ` AND game_type = ?` : ``) + ` GROUP BY winner_id ORDER BY wins DESC`, [(game ? game : null)], async (err, rows) => {
            if (err) {
                msg.channel.send("❌ An error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                return;
            }

            for (var r in rows)
                rows[r] = {
                    player: rows[r].player,
                    wins: rows[r].wins,
                    index: r
                };

            let author = getDataFromUser(rows, msg.author.id);

            let topTen = [];
            let you = author.length > 0 ? getPlacementS(Number(author[0].index) + 1, msg.author.tag, author[0].wins) : getPlacementS(rows.length + 1, msg.author.tag, 0);

            rows.splice(10);

            const promises = rows.map(async (rs) => {
                if(!rs || !rs.player || !rs.wins)
                    return;
                let user = await bot.users.fetch(rs.player);
                return getPlacementS(rows.indexOf(rs) + 1, user.tag, rs.wins);
            });

            const users = await Promise.all(promises);

            for (let u in users)
                topTen.push(users[u], "");

            msg.channel.send(new Discord.MessageEmbed()
                .setColor('YELLOW')
                .setTitle("Global Leaderboard")
                .setDescription("Global leaderboard for " + (game ? "**" + game + "**" : "total") + " wins." + (!game ? "\nTo view game data, specify a game." : ""))
                .setTimestamp()
                .addField("Top 10", "```js\n" + topTen.join("\n") + "\n```")
                .addField("You", "```js\n" + you + "\n```"));
        });

    } else if (option == "server" || option == "guild" || option == "s") {

        cooldownPlayers.set(msg.author.id, new Date().getTime());

        Bot.query(`SELECT winner_id AS player, COUNT(*) AS wins FROM games WHERE winner_id IS NOT NULL AND guild_id = ?` + (game ? ` AND game_type = ?` : ``) + ` GROUP BY winner_id ORDER BY wins DESC`, [msg.guild.id, (game ? game : null)], async (err, rows) => {
            if (err) {
                msg.channel.send("❌ An error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                return;
            }

            for (var r in rows)
                rows[r] = {
                    player: rows[r].player,
                    wins: rows[r].wins,
                    index: r
                };

            let author = getDataFromUser(rows, msg.author.id);

            let topTen = [];
            let you = author.length > 0 ? getPlacementS(Number(author[0].index) + 1, msg.author.tag, author[0].wins) : getPlacementS(rows.length + 1, msg.author.tag, 0);

            rows.splice(10);

            const promises = rows.map(async (rs) => {
                if(!rs || !rs.player || !rs.wins)
                    return;
                let user = await bot.users.fetch(rs.player);
                return getPlacementS(rows.indexOf(rs) + 1, user.tag, rs.wins);
            });

            const users = await Promise.all(promises);

            for (let u in users)
                topTen.push(users[u], "");

            msg.channel.send(new Discord.MessageEmbed()
                .setColor('YELLOW')
                .setTitle(msg.guild.name + " Leaderboard")
                .setDescription("Server leaderboard for " + (game ? "**" + game + "**" : "total") + " wins." + (!game ? "\nTo view game data, specify a game." : ""))
                .setTimestamp()
                .addField("Top 10", "```js\n" + (topTen.length > 0 ? topTen.join("\n") : "Play a game to get leaderboard action going!") + "\n```")
                .addField("You", "```js\n" + you + "\n```"));
        });

    } else if (option == "event" || option == "e") {
    
        if(guildData.eventName && guildData.eventID){

            cooldownPlayers.set(msg.author.id, new Date().getTime());

            Bot.query(`SELECT winner_id AS player, COUNT(*) AS wins FROM games WHERE winner_id IS NOT NULL AND guild_id = ? AND event_id = ?` + (guildData.eventGame || game ? ` AND game_type = ?` : ``) + ` GROUP BY winner_id ORDER BY wins DESC`, [msg.guild.id, guildData.eventID, (guildData.eventGame ? guildData.eventGame : game ?  game : null)], async (err, rows) => {
                if (err) {
                    msg.channel.send("❌ An error occurred.").then(msg2 => msg2.delete({ timeout: 10000 }));
                    return;
                }
    
                for (var r in rows)
                    rows[r] = {
                        player: rows[r].player,
                        wins: rows[r].wins,
                        index: r
                    };
    
                let author = getDataFromUser(rows, msg.author.id);
    
                let topTen = [];
                let you = author.length > 0 ? getPlacementS(Number(author[0].index) + 1, msg.author.tag, author[0].wins) : getPlacementS(rows.length + 1, msg.author.tag, 0);
    
                rows.splice(10);
    
                const promises = rows.map(async (rs) => {
                    if(!rs || !rs.player || !rs.wins)
                        return;
                    let user = await bot.users.fetch(rs.player);
                    return getPlacementS(rows.indexOf(rs) + 1, user.tag, rs.wins);
                });
    
                const users = await Promise.all(promises);
    
                for (let u in users)
                    topTen.push(users[u], "");
    
                msg.channel.send(new Discord.MessageEmbed()
                    .setColor('YELLOW')
                    .setTitle("** " + guildData.eventName + "** Leaderboard")
                    .setDescription("Event leaderboard for " + (game && !guildData.eventGame ? "**" + game + "**" : guildData.eventGame ? "**" + guildData.eventGame + "**" : "total") + " wins." + (!game && !guildData.eventGame ? "\nTo view game data, specify a game." : ""))
                    .setTimestamp()
                    .addField("Top 10", "```js\n" + (topTen.length > 0 ? topTen.join("\n") : "Play a game to get leaderboard action going!") + "\n```")
                    .addField("You", "```js\n" + you + "\n```"));
            });

        } else {
            msg.channel.send("❌ This server is not participating in an event!").then(msg2 => msg2.delete({ timeout: 10000 }));
        }

    } else {
        msg.channel.send("❌ The options are `(g)lobal`, `(s)erver`, or `(e)vent`").then(msg2 => msg2.delete({ timeout: 7000 }));
    }

}

/**
 * A quick way to create the level text for a leaderboard embed.
 * @param {*} place Current place of user.
 * @param {*} name Name of user.
 * @param {*} wins Number of wins for user.
 * @returns A formatted string for leaderboard embeds.
 */
function getPlacementS(place, name, wins) {
    return "[" + place + "] `" + name + "` Wins: " + wins;
}

/**
 * Finds the data only for that specific user.
 * @param {*} rows - Database rows returned.
 * @param {*} userid - The discord ID of the user.
 * @returns A filtered list of only data pertinent to the user.
 */
function getDataFromUser(rows, userid) {
    return rows.filter(rows => rows.player == userid);
}

module.exports.info = {
    names: ["leader", "leaderboard", "leaders", "leaderboards"]
}
