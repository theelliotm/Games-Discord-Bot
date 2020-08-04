//# Written and Developed by Xcallibur
//# © 2020 Xcallibur

const Discord = require("discord.js");
const Canvas = require("canvas");
const GameJS = require("../play.js");
const { truncateSync } = require("fs");

const types = ['r', 'g', 'b', 'y', 'w'];

module.exports.run = async (bot, id, gmsg, con) => {
  let game = GameJS.vars.currentGames.get(id);
  let embed = gmsg.embeds[0];
  if (game.gametype.name != "UNO" || game.state != 1)
    return;

  let forfeits = new Discord.Collection();
  let deck = [], hands = new Discord.Collection(), pile = [], saved = new Set();
  let time = 0, timeSinceLastAction = 0, turn = 0, totalturns = 0;
  let changed = true;

  let clockwise = true, reqColor = "r";

  //Creates Unshuffled Deck
  for (let i = 0; i < 4; i++) {
    //1-9
    for (let j = 1; j <= 9; j++)
      deck.push(types[i] + j)
    for (let j = 1; j <= 9; j++)
      deck.push(types[i] + j)
    deck.push(types[i] + "0")
    for (let j = 0; j < 2; j++) {
      deck.push(types[i] + "d");
      deck.push(types[i] + "f");
      deck.push(types[i] + "s");
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push("ww");
    deck.push("wd");
  }

  shuffleArray(deck); //shuffle deck

  //give players starting deck
  for (let i = 0; i < game.queued.length; i++) {
    let cards = [];
    for (let j = 0; j < 7; j++)
      cards.push(deck.shift());
    hands.set(game.queued[i].id, cards);
  }

  game.actions.push("The game has started.");

  do {
    pile.push(deck.shift());
  } while (isNaN(pile[pile.length - 1].charAt(1)));

  let action = "The game has started.";

  for (let p in game.dmMessages) {
    let currentDMMsg = game.dmMessages[p];
    const filter = m => m.author.id != bot.user.id;
    const actionCollector = currentDMMsg.channel.createMessageCollector(filter, { time: 3600000 });

    actionCollector.on('collect', collected => {
      if(game.state == 2){
        actionCollector.stop();
        return;
      }
      if (game.queued.map(q => q.id).indexOf(collected.author.id) > -1) {
        if (collected.content.split(" ")[0] == "UNO") {
          if (collected.content.split(" ").length == 1 || (collected.content.split(" ").length == 2 && collected.content.split(" ")[1] == collected.author.username)) {
            if (hands.get(collected.author.id).length == 1) {
              if (saved.has(collected.author.id)) {
                collected.author.send("❌ You have already been saved (for now)!").then(msg2 => msg2.delete({ timeout: 10000 }));
              } else {
                saved.add(collected.author.id);
                collected.author.send("✅ You saved yourself.").then(msg2 => msg2.delete({ timeout: 10000 }));
                changed = true;
                action = "<@" + collected.author.id + "> saved themselves from being called **UNO** on.";
              }
            } else {
              collected.author.send("❌ Unless you have one card, you must also including the __username__ of someone to call out! eg `UNO " + collected.author.username + "`").then(msg2 => msg2.delete({ timeout: 10000 }));
            }
          } else if (collected.content.split(" ").length == 2) {
            let mentioned = collected.content.split(" ")[1];
            const placement = game.queued.map(q => q.username).indexOf(mentioned);
            if (placement > -1) {
              if (hands.get(game.queued[placement].id).length == 1) {
                if (!saved.has(game.queued[placement].id)) {
                  saved.add(game.queued[placement].id);
                  collected.author.send("✅ You called out <@" + game.queued[placement].id + ">.").then(msg2 => msg2.delete({ timeout: 10000 }));
                  changed = true;
                  action = "<@" + collected.author.id + "> called out <@" + game.queued[placement].id + "> and forced them to draw 2 cards.";

                  let drawingHand = hands.get(game.queued[placement].id);
                  for (let h = 0; h < 2; h++)
                    drawingHand.push(deck.shift());
                  hands.set(game.queued[placement].id, drawingHand);
                } else {
                  collected.author.send("❌ That player has already been saved / called out.").then(msg2 => msg2.delete({ timeout: 10000 }));
                }
              } else {
                collected.author.send("❌ That player has more than one card.").then(msg2 => msg2.delete({ timeout: 10000 }));
              }
            } else {
              collected.author.send("❌ That player is not in the game.").then(msg2 => msg2.delete({ timeout: 10000 }));
            }
          } else {
            collected.author.send("❌ Only include the username of one player! eg `UNO " + collected.author.username + "`").then(msg2 => msg2.delete({ timeout: 10000 }));
          }
        } else {
          if (game.queued[turn].id == collected.author.id && game.state == 1) {
            game.actions.push(collected.content);
          } else {
            collected.author.send("❌ It is not your turn!").then(msg2 => msg2.delete({ timeout: 10000 }));
          }
        }
      } else {
        collected.author.send("❌ You are not in the game.").then(msg2 => msg2.delete({ timeout: 10000 }));
      }
    });
  }

  let interval = setInterval(function () {

    game.currentturn = game.queued[turn].id;

    if (game.state == 2) {
      embed.setDescription("The game has ended.");
      gmsg.edit(embed);

      for(let g in game.queued)
        game.queued[g].send("⚠ The game has been ended.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    if (game.queued.length < game.gametype.minPlayers) {
      game.state = 2;
      embed.setDescription("Not enough players remain!");
      gmsg.edit(embed);

      for(let g in game.queued)
        game.queued[g].send("⚠ The game has ended as not enough players remain.");

      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    if (deck.length <= 5) {
      let temp = pile.pop();
      deck = pile;
      pile = [temp];
      shuffleArray(deck); //shuffle deck
    }

    time++;
    timeSinceLastAction++;
    if (time > 3600) {
      game.state = 2;
      embed.setDescription("The game has reached its time limit.");
      gmsg.edit(embed);
      GameJS.addGameToDatabase(con, id, game, null, game.queued.map(m => m.id));
      clearInterval(interval);
      return;
    }

    if (timeSinceLastAction > 180) {
      game.actions.push("nothing");
    }

    //if action completed
    if (game.actions[totalturns + 1]) {
      if (game.actions[totalturns + 1].split(" ")[0] == 'draw') {
        forfeits.set(game.queued[turn].id, 0);

        let currentHand = hands.get(game.queued[turn].id), placeable = -1;
        for (let card in currentHand) {
          if (canBePlaced(pile[pile.length - 1], currentHand[card], reqColor) === "true") {
            placeable = card;
            break;
          }
        }

        if (placeable != -1) {
          game.queued[turn].send("❌ You do not need to draw, try playing the card **#" + (Number(placeable) + 1) + "**").then(msg2 => msg2.delete({ timeout: 7000 }));
          game.actions.pop();
        } else {
          const newCard = deck.shift();

          if (canBePlaced(pile[pile.length - 1], newCard, reqColor) === "true") {
            currentHand.push(newCard);
            hands.set(game.queued[turn].id, currentHand);

            game.queued[turn].send("✅ You drew a card that __you can play__!").then(msg2 => msg2.delete({ timeout: 10000 }));
            action = "<@" + game.queued[turn].id + "> drew from the deck.";
            game.actions.pop();
          } else {
            currentHand.push(newCard);
            hands.set(game.queued[turn].id, currentHand);
            game.queued[turn].send("✅ You drew a card.").then(msg2 => msg2.delete({ timeout: 10000 }));
            action = "<@" + game.queued[turn].id + "> drew from the deck, but could not play it.";
            totalturns++;
            turn = advanceTurn(turn, game.queued.length, clockwise);
          }
          changed = true;
          timeSinceLastAction = 0;
          
        }
      } else if (game.actions[totalturns + 1].split(" ")[0] == 'play') {
        forfeits.set(game.queued[turn].id, 0);

        let cardIdx = game.actions[totalturns + 1].split(" ")[1];
        if (cardIdx && !isNaN(cardIdx)) {
          cardIdx = cardIdx - 1;
          let currentHand = hands.get(game.queued[turn].id);
          let selectedCard = currentHand[cardIdx];

          if (selectedCard) {

            const topCard = pile[pile.length - 1];
            const type = selectedCard.charAt(0);
            const subtype = selectedCard.charAt(1);

            const placeable = canBePlaced(topCard, selectedCard, reqColor);

            if (placeable === "true") {

              if (getColor(type, false)) {
                pile.push(currentHand[cardIdx]);
                currentHand.splice(cardIdx, 1);
                changed = true;
                timeSinceLastAction = 0;
                totalturns++;

                const tempID = game.queued[turn].id;

                if (subtype == "d") {
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                  //put cards in next players deck
                  let drawingHand = hands.get(game.queued[turn].id);
                  for (let h = 0; h < 2; h++)
                    drawingHand.push(deck.shift());
                  hands.set(game.queued[turn].id, drawingHand);
                  action = "<@" + tempID + "> forced <@" + game.queued[turn].id + "> to draw two cards.";
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                } else if (subtype == "s") {
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                  action = "<@" + tempID + "> skipped <@" + game.queued[turn].id + ">'s turn.";
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                } else if (subtype == "f") {
                  action = "<@" + tempID + "> reversed the game.";
                  clockwise = !clockwise;
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                } else {
                  action = "<@" + tempID + "> played a card.";
                  turn = advanceTurn(turn, game.queued.length, clockwise);
                }
              } else { //wild
                const colorChoice = game.actions[totalturns + 1].split(" ")[2];

                if (!colorChoice) {
                  game.queued[turn].send("❌ Specify a RGBY color. `play " + (cardIdx + 1) + " [(r)ed | (g)reen | (b)lue | (y)ellow]`").then(msg2 => msg2.delete({ timeout: 7000 }));
                  game.actions.pop();
                } else {
                  const colorChar = colorChoice.charAt(0);
                  if (getColor(colorChar, false)) {

                    reqColor = colorChar.toLowerCase();
                    const tempID = game.queued[turn].id;

                    pile.push(currentHand[cardIdx]);
                    currentHand.splice(cardIdx, 1);
                    changed = true;
                    timeSinceLastAction = 0;
                    totalturns++;
                    turn = advanceTurn(turn, game.queued.length, clockwise);

                    if (subtype == "d") {
                      action = "<@" + tempID + "> forced <@" + game.queued[turn].id + "> to draw 4 cards, and selected **" + getColor(colorChar, false) + "**.";
                      //force them to draw 4 cards
                      let drawingHand = hands.get(game.queued[turn].id);
                      for (let k = 0; k < 4; k++)
                        drawingHand.push(deck.shift());
                      hands.set(game.queued[turn].id, drawingHand);

                      turn = advanceTurn(turn, game.queued.length, clockwise);
                    } else {
                      action = "<@" + tempID + "> selected **" + getColor(colorChar, false) + "** with their wild.";
                    }
                  } else {
                    game.queued[turn].send("❌ Specify a RGBY color. `play " + (cardIdx + 1) + " [(r)ed | (g)reen | (b)lue | (y)ellow]`").then(msg2 => msg2.delete({ timeout: 7000 }));
                    game.actions.pop();
                  }
                }
              }
            } else {
              game.queued[turn].send(placeable).then(msg2 => msg2.delete({ timeout: 7000 }));
              game.actions.pop();
            }
          } else {
            game.queued[turn].send("❌ " + (cardIdx + 1) + " is not in your deck.").then(msg2 => msg2.delete({ timeout: 7000 }));
            game.actions.pop();
          }
        } else {
          game.queued[turn].send("❌ Incorrect command usage. `play (number)`").then(msg2 => msg2.delete({ timeout: 7000 }));
          game.actions.pop();
        }
      } else if (game.actions[totalturns + 1].split(" ")[0] == 'nothing') {
        forfeits.set(game.queued[turn].id, forfeits.get(game.queued[turn].id) ? forfeits.get(game.queued[turn].id) + 1 : 1);
        if (forfeits.get(game.queued[turn].id) >= 3) {
          action = "Player has been unresponsive, kicking."
          if (game.owner.id == game.queued[turn].id) {
            game.state = 2;
            gmsg.channel.send("Ended " + game.gametype.name + " game.");
          } else if (game.queued.map(m => m.id).indexOf(game.queued[turn].id) > -1) {
            game.queued.splice(game.queued.map(m => m.id).indexOf(game.queued[turn].id), 1);
          }
        } else {
          action = "Player took too long, forfeited turn.";
        }

        changed = true;
        timeSinceLastAction = 0;
        totalturns++;
        turn = advanceTurn(turn, game.queued.length, clockwise);
      } else if(game.actions[totalturns + 1].split(" ")[0] == 'exit') {

        const tempID = game.queued[turn].id;
        const exitIdx = game.queued.map(m => m.id).indexOf(game.queued[turn].id);

        if(exitIdx > -1){
            action = "<@" + tempID + "> exited the game.";

            game.queued[turn].send("✅ Exited the game.");
            
            game.queued.splice(exitIdx, 1);

            if(game.owner.id == tempID)
              game.state = 2;

            changed = true;
            timeSinceLastAction = 0;
            totalturns++;
            turn = advanceTurn(turn, game.queued.length, clockwise);
        } else {
            game.queued[turn].send("❌ An error occurred processing that request.").then(msg2 => msg2.delete({ timeout: 7000 }));
        }
      } else {
        game.queued[turn].send("❌ Sorry, that is not a valid move. Try `draw` or `play (number)`.").then(msg2 => msg2.delete({ timeout: 7000 }));
        game.actions.pop();
      }
    }

    if (changed) {
      changed = false;
      let currentCard = "err", cardsInHand = [], winner = null;
      const topCard = pile[pile.length - 1];

      currentCard = getColor(topCard.charAt(0), false);
      if (topCard.charAt(0) == "w") {
        currentCard = (topCard.charAt(1) == "w") ? "Wild Card" : "Wild +4 Card";
        currentCard += " (" + getColor(reqColor, false) + ")";
      } else {
        if (isNaN(topCard.charAt(1)))
          switch (topCard.charAt(1)) {
            case 'd': currentCard += " Draw 2"; break;
            case 'f': currentCard += " Swap"; break;
            case 's': currentCard += " Skip"; break;
          }
        else
          currentCard += " " + topCard.charAt(1);
      }

      for (let i in hands.array()) {
        if (hands.array()[i].length <= 0)
          winner = hands.keyArray()[i];
        cardsInHand.push((game.queued[turn].id == hands.keyArray()[i] ? "__" : "") + "<@" + hands.keyArray()[i] + ">" + (game.queued[turn].id == hands.keyArray()[i] ? "__" : "") + ": " + hands.array()[i].length);
        if (hands.array()[i].length != 1 && saved.has(hands.keyArray()[i]))
          saved.delete(hands.keyArray()[i]);
      }

      if (winner) {
        embed = new Discord.MessageEmbed()
          .setAuthor("Current Turn: " + game.queued[turn].tag)
          .setTitle(embed.title)
          .setDescription("**WINNER: ** __<@" + winner + ">__")
          .addField("Cards In-Hand", cardsInHand.join(", "))
          .addField("Current Card", currentCard, true)
          .addField("Last Action", action, true)
          .setImage("https://xcal.dev/x/uno/" + topCard + ".png")
          .setFooter("Owner: " + game.owner.tag, game.owner.avatarURL());
        gmsg.edit(embed).then(async function (a_msg) {
          for (let _m in game.dmMessages) {
            let _message = game.dmMessages[_m];
            if (_message.channel.recipient) {
              if (game.queued.map(m => m.id).indexOf(_message.channel.recipient.id) > -1) {
                embed.setThumbnail("https://xcal.dev/x/uno/" + topCard + ".png");
                embed.setImage('attachment://unohand-donotshare-' + game.queued[turn].id + '.png');
                _message.delete();
                _message.channel.send(embed);
              }
            }
          }
        });
        game.state = 2;
        GameJS.addGameToDatabase(con, id, game, winner, game.queued.map(m => m.id));
        clearInterval(interval);
      } else {
        embed = new Discord.MessageEmbed()
          .setAuthor("Current Turn: " + game.queued[turn].tag)
          .setTitle(embed.title)
          .setDescription("In-Game (Spectator)")
          .addField("Cards In-Hand", cardsInHand.join(", "))
          .addField("Current Card", currentCard, true)
          .addField("Last Action", action, true)
          .setImage("https://xcal.dev/x/uno/" + topCard + ".png")
          .setFooter("Owner: " + game.owner.tag, game.owner.avatarURL());
        gmsg.edit(embed).then(async function (a_msg) {
          for (let _m in game.dmMessages) {
            let _message = game.dmMessages[_m];
            if (_message.channel.recipient) {
              if (game.queued.map(m => m.id).indexOf(_message.channel.recipient.id) > -1) {
                embed.setThumbnail("https://xcal.dev/x/uno/" + topCard + ".png")
                const handCards = hands.get(_message.channel.recipient.id);
                const rows = Math.floor(((handCards.length - 1) / 7)) + 1;
                const cardHeight = 144; //px divided by 12
                const cardWidth = 96; //px divided by 12
                const canvas = Canvas.createCanvas((cardWidth + 10) * 7, (cardHeight + 10) * rows);
                const ctx = canvas.getContext('2d');

                let loadedImgs = [];
                for (let m in handCards)
                  loadedImgs.push(Canvas.loadImage("./commands/games/uno/sprites/" + handCards[m] + ".png"));

                for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < 7; c++) {
                    var _cardID = handCards[(r * 7) + c];
                    if (_cardID) {
                      const __img = loadedImgs[(r * 7) + c];
                      if (__img) {
                        __img.onerror = err => { throw err; };
                        ctx.drawImage((await loadedImgs[(r * 7) + c]), (cardWidth + 10) * c, (cardHeight + 10) * r, cardWidth, cardHeight);
                      }
                    }
                  }
                }

                const imgAttachment = new Discord.MessageAttachment(canvas.toBuffer(), 'unohand-donotshare-' + game.queued[turn].id + '.png');

                if(game.queued[turn].id == _message.channel.recipient.id)
                  embed.setAuthor("It Is Your Turn!");
                else
                  embed.setAuthor("Current Turn: " + game.queued[turn].tag)
                embed.setDescription("In-Game");
                embed.setImage('attachment://unohand-donotshare-' + game.queued[turn].id + '.png');
                await game.dmMessages[_m].delete().catch(console.error);
                _message.channel.send({ files: [imgAttachment], embed: embed }).then(function (__dmmsg) { game.dmMessages[_m] = __dmmsg }).catch(console.error);
              }
            }
          }
        });
      }
    }
  }, 1000);
}

/**
 * Moves the game forward a turn.
 * @param {*} turn The current turn.
 * @param {*} playerCount The number of players in the game.
 * @param {*} clockwise Wether or not the game is going clockwise.
 */
function advanceTurn(turn, playerCount, clockwise) {
  if (clockwise) {
    turn++;
    if (turn >= playerCount)
      turn = 0;
  } else {
    turn--;
    if (turn < 0)
      turn = playerCount - 1;
  }
  return turn;
}

/**
 * Gets the color name from the first letter.
 * @param {String} char 
 * @param {Boolean} includeWild 
 */
function getColor(char, includeWild) {
  if (!char) return null;
  switch (char.toLowerCase()) {
    case "r": return "Red";
    case "b": return "Blue";
    case "g": return "Green";
    case "y": return "Yellow";
    case "w": return (includeWild) ? "Wild" : null;
    default: return null;
  }
}

/**
 * Shuffles the deck.
 * @param {Array} array The current deck.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Checks if a card can be placed.
 * @param {String} currentCard The card on the top of the pile.
 * @param {String} selectedCard The card the player wants to put on the pile.
 * @param {String} reqColor The color, if any, required by a wild.
 * @returns {String} A message to display to the player, or "true"
 */
function canBePlaced(currentCard, selectedCard, reqColor) {
  if (!currentCard || !selectedCard || !reqColor) return "❌ Error, recieved incomplete data.";

  const s_type = selectedCard.charAt(0), s_subtype = selectedCard.charAt(1), c_type = currentCard.charAt(0), c_subtype = currentCard.charAt(1);

  if (getColor(s_type, false))
    if (c_type == "w" && s_type != reqColor)
      return "❌ You must place a **" + getColor(reqColor, false) + "** card.";
    else return (c_type == s_type || c_subtype == s_subtype || c_type == "w") ? "true" : "❌ The card must have the same color, number, or type.";
  else return (s_type == "w") ? "true" : "❌ Error, not a valid card.";
}

module.exports.info = {
  name: "uno",
  displayName: "UNO",
  description: "A 2 to 8 player game where you must get rid of all your cards first.",
  minPlayers: 2,
  maxPlayers: 8,
  assetFolder: "uno",
  help : ["⚠ Remember, all commands must be done in DMs", 
        "1️⃣ `play [number] (color - if wild)` - Plays a card from your hand. Your first card is 1, your second 2, etc.", 
        "2️⃣ `draw` - Draws a card. If you can play the new card, the turn will not end until you do.", 
        "3️⃣ `UNO (username)` - Save yourself if you have one card, or call someone else out."]
}
