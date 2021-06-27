// require the discord.js module
import { Client, WebhookClient } from "discord.js";
import { config } from "dotenv";
config();
import {
  BinanceTrading,
  cancelAllOrders,
  openOrders,
  checkAccountBalance,
  checkSingle,
  toggleBot,
  botController,
  checkBot,
} from "./binance.js";
import { postMessageToDiscord } from "./utils.js";

// create a new Discord client
const client = new Client();
let playChannel;
// inside a command, event listener, etc.

// when the client is ready, run this code
// this event will only trigger one time after logging in
// ****
const { btcPrice, balance, orders } = await BinanceTrading("BTCUSDT"); //initiate data
console.log(btcPrice, balance);

client.once("ready", async () => {
  console.log("Ready!");
  playChannel = client.channels.cache.find(
    (channel) => channel.name === "bot-playground"
  );
});

client.on("message", async (message) => {
  if (message.content === "!ping") {
    // send back "Pong." to the channel the message was sent in
    // console.log(message)
    // console.log("pair", pair)
    console.log(message.content);
    playChannel.send("Pong.");
    // foobar();
  } else if (message.content === "!callingCZ") {
    //check balance
    playChannel.send(`this is CZ ${ticker}`);
  } else if (message.content === "!budget") {
    playChannel.send(`You're holding`);
  } else if (message.content === "!openorders") {
    //check open orders
    let botMessage = "";
    orders.forEach(
      (e) =>
        (botMessage += `order ${e.symbol} @ ${parseFloat(e.price).toFixed(
          2
        )} \n`)
    );
    botMessage += `hit !cancelAllOrders to cancel all open orders`;
    playChannel.send(botMessage);
  } else if (message.content.includes("!togglebot")) {
    // playChannel.send(toggleBot());
    console.log(toggleBot());
  } else if (message.content.includes("!pushmessage")) {
    const webhookKey = process.env["DISCORD_WEBHOOK"];
    const webhook = new WebhookClient(858094812120612874n, webhookKey);
    try {
      const response = await webhook.send(
        message.content.substring(13, message.content.length - 1)
      );
      console.log(`sent message ${response}`);
    } catch (e) {
      console.log("error when sending webhook message", e);
    }
  } else if (message.content === "!checkbot") {
    const message = await checkBot();
    console.log("checkbot", message);
  } else if (message.webhookID) {
    const temp = message.content.split(" ");
    const signal = {
      type: temp[0].substring(1),
      ticker: temp[1],
      interval: temp[2],
      price: parseFloat(temp[3]).toFixed(5),
      vol: parseFloat(temp[4]).toFixed(2),
    };
    console.log("signal is", signal);
    const botMessage = await botController(signal);
    console.log(botMessage.buyingLog);
    console.log(botMessage.botHolding);
  }
});

// login to Discord with your app's token
client.login(process.env["TOKEN"]);
