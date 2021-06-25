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
} from "./binance.js";
import { postMessageToDiscord } from "./utils.js";

// create a new Discord client
const client = new Client();
let playChannel;
// inside a command, event listener, etc.

// when the client is ready, run this code
// this event will only trigger one time after logging in
// var for global use
//run test on 15m, 30m, 1h, 4h
let botStatus = false;
class botConfig {
  constructor(initialBudget, maxOrder, botHolding, botType) {
    //constructor function
    this.initialBudget = initialBudget;
    this.maxOrder = maxOrder;
    this.botHolding = botHolding;
    this.botType = botType;
  }
}
let bot15m = new botConfig(1000, 200, [], "15m");
let bot30m = new botConfig(1000, 200, [], "30m");
let bot1h = new botConfig(1000, 200, [], "1h");
let bot4h = new botConfig(1000, 200, [], "4h");
console.log(bot15m, bot30m, bot1h, bot4h);
// {
//   initialBudget: 1000,
//   maxOrder: 200,
//   botHolding: [],
// };
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
    playChannel.send("Pong.");
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
  } else if (message.content === "!togglebot") {
    //switch bot on/off
    if (botStatus) {
      botStatus = false;
      playChannel.send(
        `bot is off now. Current budget is ${botConfig.initialBudget}.`
      );
    } else {
      botStatus = true;
      playChannel.send(
        `bot is running now. The default setting is: initial budget ${botConfig.initialBudget}; max single order ${botConfig.maxOrder}`
      );
    }
  } else if (message.content.includes("!pushMessage")) {
    const webhook = new WebhookClient(
      851959636785496135n,
      "7dlAHw1y_IpHP-n-cuoiqxjCJrmg1uKv0DVBY_WUFZF99xL9dCDEk094tu-00qI1dOjx"
    );
    try {
      const response = await webhook.send(
        message.content.substring(13, message.content.length - 1)
      );
      console.log(`sent message ${response}`);
    } catch (e) {
      console.log("error when sending webhook message", e);
    }
  }
  if (message.webhookID) {
    // console.log(message.content)
    const temp = message.content.split(" ");
    const signal = {
      type: temp[0].substring(1),
      ticker: temp[1],
      interval: temp[2],
      price: parseFloat(temp[3]).toFixed(5),
      vol: parseFloat(temp[4]).toFixed(2),
    };
    console.log("signal is", signal);
    if (botStatus) {
      //check binance price
      const spotPrice = await checkSingle(signal.ticker);
      console.log("spot price is", spotPrice);
      //check available balance & budget
      // const availBal = parseFloat(accountBalance.find(e => e.symbol === "USDT").available).toFixed(2);
      const availBal = botConfig.initialBudget; //use this for virtual run
      const threshold = 0.03; //default threshold is 3%
      if (signal.type.toUpperCase() === "BUY") {
        if (
          parseFloat(spotPrice[signal.ticker]).toFixed(5) <=
          parseFloat(signal.price) * (1 + threshold)
        ) {
          //buy the ticker or its corresponding leverage token on binance
          if (signal.ticker.includes("UPUSDT")) {
            //it's a leverage token
            botConfig.botHolding.push({
              ticker: signal.ticker,
              price: spotPrice[signal.ticker],
              amount: botConfig.maxOrder / spotPrice[signal.ticker],
            });
            botConfig.initialBudget -= botConfig.maxOrder;
            playChannel.send(
              `bot is buying ${signal.ticker} @ spot price ${parseFloat(
                spotPrice[signal.ticker]
              ).toFixed(2)} - total amount ${parseFloat(
                botConfig.maxOrder / spotPrice[signal.ticker]
              ).toFixed(2)}`
            );
          } else {
            //not a leverage token
            console.log("It's not a leverage token");
          }
        }
      } else {
        //type sell
        if (
          parseFloat(spotPrice[signal.ticker]).toFixed(5) >=
          parseFloat(signal.price) * (1 + threshold)
        ) {
          //buy the ticker or its corresponding leverage token on binance
          if (signal.ticker.includes("DOWNUSDT")) {
            //it's a leverage token
            botConfig.botHolding.push({
              ticker: signal.ticker,
              price: spotPrice[signal.ticker],
              amount: botConfig.maxOrder / spotPrice[signal.ticker],
            });
            botConfig.initialBudget -= botConfig.maxOrder;
            playChannel.send(
              `bot is buying ${signal.ticker} @ spot price ${parseFloat(
                spotPrice[signal.ticker]
              ).toFixed(2)} - total amount ${parseFloat(
                botConfig.maxOrder / spotPrice[signal.ticker]
              ).toFixed(2)}`
            );
          } else {
            //not a leverage token
            console.log("It's not a leverage token");
          }
        }
      }
      console.log(botConfig);
      let botMessage = "Bot is holding: \n";
      botConfig.botHolding.forEach(
        (e) =>
          (botMessage += `${e.ticker} @ ${parseFloat(e.price).toFixed(
            2
          )} - total amount ${parseFloat(e.amount).toFixed(2)} \n`)
      );
      botMessage += `Total budget ${botConfig.initialBudget}`;
      playChannel.send(botMessage);
    }
  }
});

// login to Discord with your app's token
client.login(process.env["TOKEN"]);
