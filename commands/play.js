//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const fs = require("fs");
const Bot = require("../bot");

var currentGames = new Discord.Collection();
var gameFiles = new Discord.Collection();

let availableGames = [];

fs.readdir("./commands/games/", (err, files) => {
  if (err) console.log(err);
  //removes period to get game name
  let jsfile = files.filter(f => f.split(".").pop() === "js")
  //registers games
  jsfile.forEach((f, i) => {
    let props = require(`./games/${f}`);
    console.log(`${f} (game) has loaded.`);
    if (props.info.name) {
      gameFiles.set(props.info.name, props);
      availableGames.push({
        name: props.info.displayName,
        minPlayers: props.info.minPlayers,
        maxPlayers: props.info.maxPlayers,
        description: props.info.description,
        file: props.info.assetFolder,
        help: props.info.help,
      });
    }
  });
});

module.exports.run = async (bot, msg, args, guildData) => {

  const option = args[0] ? args.filter(a => !a.startsWith('<@!')).join(" ").toLowerCase() : null;

  if (!option) {
    msg.channel.send(new Discord.MessageEmbed()
      .setColor('BLUE')
      .setTitle("Games List")
      .setDescription("Games currently available to play. To start one, run `" + guildData.prefix + "play [game] @user...`")
      .addField("Games", availableGames.map(g => "`" + g.name + "` - " + g.description)));
    return;
  }

  for (var g in currentGames.array()) {
    if ((currentGames.array()[g].owner.id == msg.author.id || currentGames.array()[g].queued.map(q => q.id).indexOf(msg.author.id) > -1) && currentGames.array()[g].state != 2) {
      msg.channel.send("⚠ You are already playing a game.").then(msg2 => msg2.delete({ timeout: 7000 }));
      return;
    }
  }
  const idx = availableGames.map(m => m.name.toLowerCase()).indexOf(option);
  if (idx > -1) {
    var id = Bot.generate(10);
    const pset = new Set(msg.mentions.users.array());
    const psetval = pset.values();
    var parr = [];

    for (var i = 0; i < pset.size; i++) {
      const vtmp = psetval.next().value;
      if (vtmp.id != msg.author.id && !vtmp.bot) parr.push(vtmp);
    }

    if (parr.length + 1 < availableGames[idx].minPlayers) {
      const pCount = (availableGames[idx].minPlayers - 1);
      msg.channel.send("❌ You need to mention at least **" + pCount + "** other player" + (pCount != 1 ? "s" : "") + " to play.").then(msg2 => msg2.delete({ timeout: 7000 }));
      return;
    }
    if (parr.length + 1 > availableGames[idx].maxPlayers) {
      msg.channel.send("❌ Only **" + + availableGames[idx].maxPlayers + "** players can play, including yourself.").then(msg2 => msg2.delete({ timeout: 7000 }));
      return;
    }

    let game = {
      gametype: availableGames[idx],
      owner: msg.author,
      unqueued: parr,
      queued: [msg.author],
      inittime: new Date().getUTCMilliseconds(),
      timeleft: 300000,
      guild: msg.guild,
      channel: msg.channel,
      currentturn: msg.author.id,
      actions: [],
      dmMessages: [],
      spectateMessage: null,
      state: 0 //states: 0 = Started, 1 = Playing, 2 = Finished
    };

    currentGames.set(id, game);
    queuegame(this, id, bot);
  } else {
    msg.channel.send("❌ Not a valid game. To view games, run `" + guildData.prefix + "games`").then(msg2 => msg2.delete({ timeout: 7000 }));
  }
}

async function queuegame(instance, id, bot) {
  var minutesLeft = 5;
  var secondsLeft = minutesLeft * 60;
  var game = currentGames.get(id);
  var embed = new Discord.MessageEmbed()
    .setColor('GREEN')
    .setTitle("Game - **" + game.gametype.name + "**")
    .setDescription("Waiting on players...")
    .addField("Minutes Left", minutesLeft + " Minutes", true)
    .addField("Players Queued", game.queued.length + "/" + (Number(game.unqueued.length) + 1) + " Players", true)
    .setFooter("Owner: " + game.owner.tag, game.owner.avatarURL());

  game.channel.send(embed).then(async function (m) {
    game.spectateMessage = m.url;
    let dmbed = new Discord.MessageEmbed();
    dmbed.setTitle("Game - **" + game.gametype.name + "**")
    dmbed.setDescription("The game will begin shortly...");

    game.queued[0].send(dmbed).then(dmmsg => game.dmMessages.push(dmmsg));
    const help = new Discord.MessageEmbed()
      .setColor("GREEN")
      .setTitle("Help - **" + game.gametype.name + "**")
      .setDescription("Information you will need to play.")
      .addField("Information", game.gametype.help);

    game.queued[0].send(help).then(msg2 => msg2.delete({ timeout: 600000 }));

    if (game.unqueued.length > 0)
      game.queued[0].send("✅ The game will begin soon, come here to view information and play.").then(msg2 => msg2.delete({ timeout: 10000 }));
    else
      game.queued[0].send("✅ The game is beginning! You'll be versing against the 🤖 machine. Good luck.").then(msg2 => msg2.delete({ timeout: 10000 }));

    for (let u in game.unqueued) {
      game.unqueued[u].send("<@" + game.owner + "> has requested to play `" + game.gametype.name + "` with you from <#" + game.channel.id + "> 🎉. To join in on the fun, react with a ✅. Otherwise, react with a ❌. The game begins here in your DMs in 5 minutes.")
        .then(async function (m2) {
          await m2.react("✅");
          await m2.react("❌");
          const filter = (reaction, user) => { return bot.user.id !== user.id; }
          const collector = m2.createReactionCollector(filter, { time: 300000 });
          collector.on('collect', (reaction) => {
            if (reaction.emoji.name == "✅") {

              let denied = false;

              if (game.state == 0) {

                for (let g in currentGames.array())
                  if ((currentGames.array()[g].owner.id == game.unqueued[u].id || currentGames.array()[g].queued.map(q => q.id).indexOf(game.unqueued[u].id) > -1) && currentGames.array()[g].state != 2) {
                    m2.edit("⚠ Please exit your current game and re-react.");
                    denied = true;
                  }

                if (!denied) {
                  m2.delete();

                  game.unqueued[u].send(dmbed).then(function (dmmsg) {
                    game.dmMessages.push(dmmsg)

                    game.unqueued[u].send("✅ Thanks, the game will start shortly. Game information will be shown and actions will be taken in this DM. If you want to comment on the game, go here <#" + game.channel.id + ">.").then(msg2 => msg2.delete({ timeout: 10000 }));
                    game.queued.push(game.unqueued[u]);

                    embed.fields.splice(0, 2);
                    embed.addField("Minutes Left", minutesLeft + " Minute" + (minutesLeft == 1 ? "" : "s"), true)
                    embed.addField("Players Queued", game.queued.length + "/" + (Number(game.unqueued.length) + 1) + " Players", true)
                    m.edit(embed);

                    game.unqueued[u].send(help).then(msg2 => msg2.delete({ timeout: 600000 }));

                    if (Number(game.queued.length) == Number(game.unqueued.length) + 1 && minutesLeft > 0) {
                      game.state = 1;
                      let gfile = gameFiles.get(game.gametype.file);
                      if (gfile) {
                        gfile.run(bot, id, m);
                      }
                      return;
                    }
                  });
                }
              }

              if (!denied) collector.stop();
            } else if (reaction.emoji.name == "❌") {
              m2.edit("Response recieved.")
              game.unqueued.splice(u, 1);
              collector.stop();
            }
          });
          collector.on('end', (reaction) => {
            if (reaction.size == 0) m2.delete();
          });

        });
    }

    var interval = setInterval(function () {
      secondsLeft--;

      if (game.state == 1) {
        clearInterval(interval);
        return;
      } else if (game.state == 2) {
        embed.setDescription("The game was ended.");
        m.edit(embed);
        for (m in game.dmMessages) {
          game.dmMessages[m].delete();
          game.dmMessages[m].channel.send("⚠ The game has been ended.");
        }
        clearInterval(interval);
        return;
      } else if ((game.unqueued.length + game.queued.length) < game.gametype.minPlayers) {
        embed.setDescription("Too many players declined.");
        m.edit(embed);
        game.state = 2;
        for (m in game.dmMessages) {
          game.dmMessages[m].delete();
          game.dmMessages[m].channel.send("⚠ Too many players declined, the game is over.");
        }
        clearInterval(interval);
        return;
      } else if (game.unqueued.length === 0) {
        if (Number(game.queued.length) >= game.gametype.minPlayers) {
          clearInterval(interval);
          game.state = 1;
          let gfile = gameFiles.get(game.gametype.file);
          if (gfile)
            gfile.run(bot, id, m);
        }
      }

      if (secondsLeft % 60 == 0) {
        minutesLeft--;
        embed.fields.splice(0, 2);
        embed.addField("Minutes Left", minutesLeft + " Minutes", true)
        embed.addField("Players Queued", game.queued.length + "/" + (Number(game.unqueued.length) + 1) + " Players", true)
        m.edit(embed);
        if (minutesLeft <= 0) {
          clearInterval(interval);
          if (Number(game.queued.length) >= game.gametype.minPlayers) {
            game.state = 1;
            let gfile = gameFiles.get(game.gametype.file);
            if (gfile)
              gfile.run(bot, id, m);
          } else {
            embed.setDescription("😢 Sorry, not enough players joined.");
            game.state = 2;
            game.timeleft = 0;
            m.edit(embed);
            for (m in game.dmMessages) {
              var __embed = game.dmMessages[m].embed;
              if (!__embed) continue;
              __embed.setDescription("😢 Sorry, not enough players joined.");
              game.dmMessages[m].edit(__embed);
            }
          }
          return;
        }
      }
    }, 1000);
  });
}

module.exports.getGames = (guildID, all) => {
  let available = new Discord.Collection();
  for (var g in currentGames.array()) {
    if (currentGames.array()[g].guild.id == guildID && (all || currentGames.array()[g].state != 2))
      available.set(currentGames.keyArray()[g], currentGames.array()[g]);
  }
  return available;
}

module.exports.setGame = (gameID, json) => {
  if (!gameID || !json) return;
  currentGames.set(gameID, json);
}

module.exports.addGameToDatabase = async (id, game, winner, players) => {
  let json, inEvent;

  try { json = await Bot.fetchCachedData(game.guild.id) }
  catch (e) { console.log(e) }

  if (json)
    if (json.eventID && json.eventName && !json.eventPaused){
      if (json.eventGame) {
        if (json.eventGame.toLowerCase() === game.gametype.name.toLowerCase())
          inEvent = true;
      } else {
        inEvent = true;
      }
    }

  Bot.query(`INSERT INTO games (game_id, game_type, guild_id, winner_id, player_ids, time, event_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, game.gametype.name.toLowerCase(), game.guild.id, winner, players.join(","), new Date().getTime(), inEvent ? json.eventID : null], (err) => {
    if (err) {
      game.owner.send("Sorry, an error occurred and your game was not tallied. 😢");
      console.log(err);
    }
  });
}

module.exports.info = {
  name: "play",
  inDMs: false
}

module.exports.vars = { availableGames, currentGames };

// for (let d in availableGames) {
//   if (subcommand == availableGames[d].name.toLowerCase()) {
//     for (var g in currentGames.array())
//       if ((currentGames.array()[g].owner.id == msg.author.id || currentGames.array()[g].queued.map(q => q.id).indexOf(msg.author.id) > -1) && currentGames.array()[g].state != 2)
//         if (currentGames.array()[g].gametype.name.toLowerCase() == subcommand) {
//           if (args.length < 2) return;
//           if (currentGames.array()[g].currentturn == msg.author.id && currentGames.array()[g].state == 1) {
//             currentGames.array()[g].actions.push(args.slice(1).join(" "));
//           } else {
//             msg.author.send("❌ It is not your turn!").then(msg2 => msg2.delete({ timeout: 5000 }));
//           }
//           msg.delete();
//           return;
//         }
//     msg.channel.send("❌ You are not playing that game.");
//     return;
//   }
// }
