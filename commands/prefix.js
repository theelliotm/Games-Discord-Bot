//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Bot = require("../bot");

/**
 * Updates the server's prefix and saves it in the database.
 * Forces a recache of the guild data.
 * @param {*} msg The command message.
 * @param {*} args The arguments after the command, in an array.
 * @param {*} con The SQL connection for database access.
 * @param {*} guildData Guild settings where the command was sent. (In this case, the current prefix)
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
    if(args.length == 0){
        msg.channel.send("❌ Please include a prefix. Maximum of 5 characters.\nIf you want no prefix, specify `NOTHING`. If you want the default, specify `DEFAULT`.").then(msg2 => msg2.delete({ timeout: 7000 }));
        return;
    }

    if(new Date().getTime() - guildData.lastUpdated < 60000){
        msg.channel.send("❌ You can only update your guild prefix once a minute.").then(msg2 => msg2.delete({ timeout: 10000 }));
        return;
    }

    let prefix = args.join(" ");

    if(prefix == "NOTHING")
        prefix = "";

    if(prefix == "DEFAULT")
        prefix = "g!";
        
    if(prefix.length > 5){
        msg.channel.send("❌ Prefixes have a maximum of five characters.").then(msg2 => msg2.delete({ timeout: 7000 }));
        return;
    }

    if(prefix === guildData.prefix){
        msg.channel.send("⚠ That is already this server's prefix.");
        return;
    }

    con.query(`UPDATE guilds SET prefix = ?, last_updated = ? WHERE id = ?`, [prefix, new Date().getTime(), msg.guild.id], (err) => {
        if (err) {
            console.log(err);
            msg.channel.send("❌ An error occurred.");
            return;
        } else {
            Bot.fetchCachedData(msg.guild.id, true);
            msg.channel.send("✅ Prefix updated. It might take a moment to take effect.");
            return;
        }
    });
}

module.exports.info = {
    name: "prefix",
    adminOnly: true
}
