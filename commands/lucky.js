//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Game = require("./play")

const shuffleTime = 3000;
var cooldownPlayers = new Discord.Collection();

/**
 * Shuffles through the game list and chooses a random one for the user to play.
 * @param {*} msg The command message.
 * @param {*} guildData Guild settings where the command was sent. (In this case, the current prefix)
 */
module.exports.run = async (bot, msg, args, con, guildData) => {
  if(cooldownPlayers.get(msg.author.id) && (new Date().getTime() - cooldownPlayers.get(msg.author.id)) < shuffleTime){
    msg.channel.send("⌚ Please wait `" +  Math.ceil((shuffleTime - (new Date().getTime() - cooldownPlayers.get(msg.author.id))) / 1000) + " seconds` and try again.").then(msg2 => msg2.delete({ timeout: 5000 }));
    return;
  }

  cooldownPlayers.set(msg.author.id, new Date().getTime());

  msg.channel.send("Shuffling... 🎲").then(m => {
    let gameMap = Game.vars.availableGames.map(g => g.name);
    let choice = gameMap[Math.floor(Math.random() * gameMap.length)];
    setTimeout(function(){
       m.edit("Our randomness machine chose " + choice.charAt(0).toUpperCase() + choice.slice(1) + "! To play it, run `" + guildData.prefix + "play " + choice + " @user...`.");
    }, shuffleTime);
  })
}

module.exports.info = {
  names: ["lucky", "shuffle", "random"],
  inDMs: false
}
