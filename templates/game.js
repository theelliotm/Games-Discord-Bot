//# Written and Developed by Xcallibur

const Discord = require("discord.js");
const Canvas = require("canvas");
const GameJS = require("../play.js");

module.exports.run = async (bot, id, gmsg, con) => {
  let game = GameJS.vars.currentGames.get(id);
  let embed = gmsg.embeds[0];
  if (game.gametype.name != "Game Name" || game.state != 1)
    return;

  let forfeits = new Discord.Collection(); /*The number of forfeits for each player. Increments when a player takes too long on a turn.*/
  let time = 0 /*Total game time*/, timeSinceLastAction = 0 /*How many iterations (seconds) since the turn changed.*/;
  let currentPlayer = game.queued[0] /*The current turn's player*/, totalturns = -1 /*How many turns have occurred (useful to check if actions list updated)*/, warned = false /*Wether or not a player was warned about low time*/;
  let changed = true /*Wether or not to update the embed this iteration */, lastAction = "The game has started." /*The message to display in the embed about what happened.*/;

  /* Creates message collectors in each DM to react when an action is passed through. */
  for (let p in game.dmMessages) {
    let currentDMMsg = game.dmMessages[p];
    const filter = m => m.author.id != bot.user.id;
    const actionCollector = currentDMMsg.channel.createMessageCollector(filter, { time: 3600000 });

    actionCollector.on('collect', collected => {
      if (game.state == 2) {
        actionCollector.stop();
        return;
      }
      if (game.queued.map(q => q.id).indexOf(collected.author.id) > -1) {
        if (currentPlayer.id == collected.author.id && game.state == 1)
          game.actions.push(collected.content);
        else
          collected.author.send("❌ It is not your turn!").then(msg2 => msg2.delete({ timeout: 10000 }));
      } else {
        actionCollector.stop();
      }
    });
  }

  /*Timer that runs every second */
  let interval = setInterval(function () {
    game.currentturn = currentPlayer.id;

    /*Checks if game has been ended. */
    if (game.state == 2) {
      embed.setDescription("The game has ended.");
      gmsg.edit(embed);

      for (let g in game.queued)
        game.queued[g].send("⚠ The game has been ended.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    /*Checks if too many players left */
    if (game.queued.length === 1) {
      game.state = 2;
      embed.setDescription("Not enough players remain!");
      gmsg.edit(embed);

      for (let g in game.queued)
        game.queued[g].send("⚠ The game has ended as not enough players remain.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    time++;
    timeSinceLastAction++;
    
    /*Checks if time has expired. */
    if (time > 3600) {
      game.state = 2;
      embed.setDescription("The game has reached its time limit.");
      gmsg.edit(embed);
      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    /*Warns player when less than 30 seconds left. */
    if(timeSinceLastAction > 150 && !warned){
      currentPlayer.send("⌛ You have 30 seconds to move before your turn is forfeited.").then(msg2 => msg2.delete({ timeout: 7000 }));
      warned = true;
    }

    /*Forfeits a player's turn */
    if (timeSinceLastAction > 180) {
        lastAction = "<@!" + currentPlayer.id + "> forfeited their turn.";
        forfeits.set(currentPlayer.id, forfeits.has(currentPlayer.id) ? forfeits.get(currentPlayer.id) + 1 : 1);
        if(forfeits.get(currentPlayer.id) >= 3){
          currentPlayer.send("⌛ You forfeited the game.");
          let other = game.queued[currentPlayer.id === game.queued[0].id ? 1 : 0];
          other.send("⚠ The other player forfeited the game.");
          game.state = 2; //in this case it's a two player game so I can end it, but you should remove the player from the queued array to make sure nothing goes wrong
          lastAction = "<@!" + currentPlayer.id + "> forfeited the game."
        } else currentPlayer.send("❌ You waited too long.").then(msg2 => msg2.delete({ timeout: 7000 }));
      advanceTurn();
      changed = true;
    }

    /*Runs when a player sends an action. */
    if (game.actions[totalturns + 1]) {
      let command = game.actions[totalturns + 1];
      game.actions.pop(); //run when an invalid command goes through so you can check for a new one

      //run the following code when the player executed a proper command
      forfeits.set(currentPlayer, 0);
      lastAction = "<@!" + currentPlayer.id + "> did something!";
      advanceTurn();
      changed = true;
    }

    /*Updates the embed */
    if (changed) {
      changed = false;
      let checkWin = checkWin();

      calcImage().then((imgAttachment) => {
        if (!imgAttachment)
          console.log("Error creating image attachment!");
          
        let winner;
        if (checkWin) {
            updateEmbeds(true);
            game.state = 2;
            GameJS.addGameToDatabase(con, id, game, winner.id, game.queued.map(m => m.id));
        } else {
          embed = new Discord.MessageEmbed()
            .setTitle(embed.title)
            .addField("Last Action", lastAction, true)
            .setFooter("Owner: " + game.owner.tag, game.owner.avatarURL());
          updateEmbeds();
        }

        /**
         * Updates spectator and DM embeds with new image and data.
         * @param {boolean} forWinner If the embed needs to display the winner.
         */
        async function updateEmbeds(forWinner) {
          let updatedSpectator = false;
          for (let _m in game.dmMessages) {
            let _message = game.dmMessages[_m];
            if (_message.channel.recipient) {
              if (game.queued.map(m => m.id).indexOf(_message.channel.recipient.id) > -1) {
                if (currentPlayer.id == _message.channel.recipient.id)
                  embed.setAuthor("It Is Your Turn!");
                else
                  embed.setAuthor("Current Turn: " + currentPlayer.tag)
                embed.setDescription(forWinner ? "**WINNER: ** __<@" + winner.id + ">__" : "In-Game");
                if (forWinner) {
                  embed.spliceFields(0, 2);
                  embed.addField("Last Action", lastAction, true)
                  console.log(lastAction);
                  embed.setAuthor("");
                } else embed.spliceFields(1, 1);

                embed.addField("Your Color", "Red", true);
                embed.setImage('attachment://image.png');
                await game.dmMessages[_m].delete().catch(console.error);
                _message.channel.send({ files: [imgAttachment], embed: embed }).then(async function (__dmmsg) {
                  game.dmMessages[_m] = __dmmsg;

                  /*Checks if the spectator window has already been updated by a DM window. In this case the image shown in DMs is not private to a user so it can be shown.*/
                  if (!updatedSpectator) {
                    let att = __dmmsg.embeds[0].image;
                    if (att) {
                      embed.setImage(att.url);
                      embed.spliceFields(1, 1);
                      embed.setAuthor("Current Turn: " + currentPlayer.tag);
                      if (!forWinner)
                        embed.setDescription("In-Game (Spectator)")
                      else
                        embed.setAuthor("");
                      gmsg.edit(embed);
                      updatedSpectator = true;
                    }
                  }
                }).catch(console.error);
              }
            }
          }
        }
      });
    }
  }, 1000);

  /**
   * Determines if there is a winner.
   * @returns Which player, if any, wins.
   */
  function checkWin() {
    return null; // no winner found
  }

  /**
   * Promises the creation of a new image.
   * @returns A promise of a MessageAttachment that contains an image of the game.
   */
  async function calcImage() {
    return new Promise(function (resolve, reject) {
      const canvas = Canvas.createCanvas(imageSize, imageSize);
      const ctx = canvas.getContext('2d');

      Canvas.loadImage("./commands/games/gameassetfolder/something.png").then(image => {
            if (image) {
              image.onerror = err => { throw err; };
              ctx.drawImage(image, 0, 0, 1, 1);
            } else reject("Could not find image sprite");
            resolve(new Discord.MessageAttachment(canvas.toBuffer(), 'image.png'));
      });
    });
  }

  /**
   * Moves the game forward a turn.
   * @param {Boolean} isForfeit Wether or not this advance is the result of a forfeit.
   */
  function advanceTurn(isForfeit) {
    warned = false;
    if(!isForfeit) totalturns++;
    timeSinceLastAction = 0;
    changed = true;
    currentPlayer = game.queued[currentPlayer == game.queued[0] ? 1 : 0];
  }
}

/**
 * Returns game information relevant to the game handler.
 */
module.exports.info = {
  name: "gamename",
  displayName: "Display Name",
  description: "A 2 player game where you must win.",
  minPlayers: 2,
  maxPlayers: 2,
  assetFolder: "gameassetfolder",
  help: ["⚠ __Remember, all commands must be done in DMs__", "",
    "❓ The goal of Game is to win", "",
    "🎮 To play, say `superior` and find out if you are indeed superior."]
}
