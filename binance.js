import Binance from "node-binance-api";
import { config } from "dotenv";
config();

const binance = new Binance().options({
  APIKEY: process.env["BINANCE_API"],
  APISECRET: process.env["BINANCE_APISECRET"],
  useServerTime: true,
});

class botConfig {
  constructor(
    initialBudget,
    currentBudget,
    maxOrder,
    botHolding,
    status,
    botType
  ) {
    //constructor function
    this.initialBudget = initialBudget;
    this.currentBudget = currentBudget;
    this.maxOrder = maxOrder;
    this.botHolding = botHolding;
    this.status = status;
    this.botType = botType;
  }
}
// var for global use
//run test on 15m, 30m, 1h, 4h
let botStatus = false;
let marketsPrice = {};
let subList = {};
let bot15m = new botConfig(1000, 1000, 200, [], "AVAILABLE", "15m");
let bot30m = new botConfig(1000, 1000, 200, [], "AVAILABLE", "30m");
let bot1h = new botConfig(1000, 1000, 200, [], "AVAILABLE", "1h");
let bot4h = new botConfig(1000, 1000, 200, [], "AVAILABLE", "4h");
//**************** */
//configuring and running bots
const toggleBot = async () => {
  //switch bot on/off
  const response = "";
  if (botStatus) {
    botStatus = false;
    await terminateWebsocket("!miniTicker@arr");
    console.log("turning off bot");
    // response = `bot is off now. Current budget is ${botConfig.initialBudget}.`;
  } else {
    botStatus = true;
    await websocketMiniTicker("BTCUSDT");
    console.log("turning on bot");
    // response = `bot is running now. The default setting is: initial budget ${botConfig.initialBudget}; max single order ${botConfig.maxOrder}`;
  }
  return response;
};

const checkBot = async () => {
  let message = {
    bot15m: `${bot15m.currentBudget} ${bot15m.status} `,
    bot30m: `${bot30m.currentBudget} ${bot30m.status} `,
    bot1h: `${bot1h.currentBudget} ${bot1h.status} `,
    bot4h: `${bot4h.currentBudget} ${bot4h.status} `,
  };
  bot15m.botHolding.forEach(
    (e) =>
      (message.bot15m += `${e.ticker} @ ${parseFloat(e.price).toFixed(
        2
      )} - total amount ${parseFloat(e.amount).toFixed(5)} \n`)
  );
  bot30m.botHolding.forEach(
    (e) =>
      (message.bot30m += `${e.ticker} @ ${parseFloat(e.price).toFixed(
        2
      )} - total amount ${parseFloat(e.amount).toFixed(5)} \n`)
  );
  bot1h.botHolding.forEach(
    (e) =>
      (message.bot1h += `${e.ticker} @ ${parseFloat(e.price).toFixed(
        2
      )} - total amount ${parseFloat(e.amount).toFixed(5)} \n`)
  );
  bot4h.botHolding.forEach(
    (e) =>
      (message.bot4h += `${e.ticker} @ ${parseFloat(e.price).toFixed(
        2
      )} - total amount ${parseFloat(e.amount).toFixed(5)} \n`)
  );
  return botStatus ? message : "bot is not running";
};

const botController = async (signal) => {
  let message = { buyingLog: "", botHolding: "" };
  let foundBot = {};
  switch (parseInt(signal.interval)) {
    case 15:
      signal.interval = "15m";
      break;
    case 30:
      signal.interval = "30m";
      break;
    case 60:
      signal.interval = "1h";
      break;
    case 240:
      signal.interval = "4h";
      break;
  }
  if (signal.interval.length < 6) {
    foundBot = eval("bot" + signal.interval);
  }
  if (botStatus && foundBot) {
    //check binance price
    let spotPrice = parseFloat(marketsPrice[signal.ticker].close).toFixed(2);
    spotPrice = spotPrice
      ? spotPrice
      : parseFloat(await checkSingle(signal.ticker)).toFixed(2);
    //check available balance & budget
    // const availBal = parseFloat(accountBalance.find(e => e.symbol === "USDT").available).toFixed(2);
    const availBal = foundBot.currentBudget; //use this for virtual run
    const threshold = 0.03; //default threshold is 3%

    if (signal.type.toUpperCase() === "BUY") {
      //buy signal
      if (foundBot.status.toUpperCase() === "SELL") {
        //BOT is holding SELL order => liquidate all current SELL orders
        foundBot.botHolding.forEach((e) => {
          const orderValue =
            e.amount * (e.price - spotPrice) + foundBot.maxOrder;
          foundBot.currentBudget += orderValue; //profit/loss realized
          console.log(spotPrice);
        });
        foundBot.botHolding = [];
      } //status if
      if (spotPrice <= parseFloat(signal.price) * (1 + threshold)) {
        foundBot.botHolding.push({
          ticker: signal.ticker,
          price: spotPrice,
          amount: (foundBot.maxOrder * 3) / spotPrice, //margin x3
          borrow: foundBot.maxOrder * 2,
        });
        foundBot.currentBudget -= foundBot.maxOrder;
        foundBot.status = "BUY";
        message.buyingLog = `${foundBot.botType} - bot is buying ${
          signal.ticker
        } @ spot price ${spotPrice} - total amount ${parseFloat(
          (foundBot.maxOrder * 3) / spotPrice
        ).toFixed(5)}`;
      }
    } else {
      //type sell
      if (foundBot.status.toUpperCase() === "BUY") {
        //BOT is holding BUY order => liquidate all current BUY orders
        foundBot.botHolding.forEach((e) => {
          const orderValue = e.amount * spotPrice - e.borrow;
          foundBot.currentBudget += orderValue; //profit/loss realized
          console.log(spotPrice);
        });
        foundBot.botHolding = [];
      } //status if
      if (spotPrice >= parseFloat(signal.price) * (1 - threshold)) {
        foundBot.botHolding.push({
          ticker: signal.ticker,
          price: spotPrice,
          amount: (foundBot.maxOrder * 3) / spotPrice, //margin x3
          borrow: foundBot.maxOrder * 2,
        });
        foundBot.currentBudget -= foundBot.maxOrder;
        foundBot.status = "SELL";
        message.buyingLog = `${foundBot.botType} - bot is selling ${
          signal.ticker
        } @ spot price ${spotPrice} - total amount ${parseFloat(
          (foundBot.maxOrder * 3) / spotPrice
        ).toFixed(5)}`;
      }
    }
    console.log("finished", foundBot);
    foundBot.botHolding.forEach(
      (e) =>
        (message.botHolding += `${e.ticker} @ ${parseFloat(e.price).toFixed(
          2
        )} - total amount ${parseFloat(e.amount).toFixed(5)} \n`)
    );
    message.botHolding += `Total budget ${foundBot.currentBudget} - ${foundBot.botType}`;
  }
  return message;
};

//calling Binance API
const checkSingle = (symbol) => {
  //check single ticker price
  return binance.prices(`${symbol.toUpperCase()}`);
};
const checkAccountBalance = async () => {
  //check account balance info
  await binance.useServerTime();
  let response;
  let mainBalance = [];
  try {
    response = await binance.balance();
    for (let property in response) {
      if (
        parseFloat(response[property]["available"]).toFixed(2) > 0 ||
        parseFloat(response[property]["onOrder"]).toFixed(2) > 0
      ) {
        mainBalance.push({
          symbol: property,
          ...response[property],
        });
      }
    }
  } catch (e) {
    console.log("calling account balance error ", e);
  }

  return mainBalance;
};

const openOrders = () => {
  //retrieve all openOrders
  return binance.openOrders();
};
const cancelAllOrders = async (symbol) => {
  //cancel all orders of a symbol
  await binance.cancelAll(symbol);
};

const trailingStop = (bot, price) => {
  // decide to sell at trailing stop price ?
  if (
    tempArr[trailingStop[symbol].purchasePriceIndex]["trailingPrice"] >=
    trailingStop[symbol].marketPrice
  ) {
    callMarketSell({
      symbol: symbol,
      qty: parseFloat(
        Math.floor(
          balance[trailingStop[symbol].balanceIndex]["available"] * 100
        ) / 100 //floor will round to the lowest integer
      ),
    });
    tempArr[trailingStop[symbol].purchasePriceIndex]["runTrailing"] = false;
    tempArr[trailingStop[symbol].purchasePriceIndex]["trailingPrice"] = 0;
  } else {
    if (
      trailingStop[symbol].marketPrice >=
      trailingStop[symbol].boughtPrice * (1 + trailingUp / 100)
    ) {
      if (
        tempArr[trailingStop[symbol].purchasePriceIndex]["trailingPrice"] <
        trailingStop[symbol].marketPrice * (1 - trailingDown / 100)
      ) {
        // only update new trailing price if the new one higher than prev one
        //aim to maximize profit on stop loss
        tempArr[trailingStop[symbol].purchasePriceIndex]["trailingPrice"] = (
          trailingStop[symbol].marketPrice *
          (1 - trailingDown / 100)
        ).toFixed(5);
      }
    } else {
      tempArr[trailingStop[symbol].purchasePriceIndex]["trailingPrice"] = (
        trailingStop[symbol].boughtPrice *
        (1 - trailingDown / 100)
      ).toFixed(5);
    }
  }
};

const websocketMiniTicker = async (ticker) => {
  //no weight limit on websocket but 5 live stream/ip
  try {
    const response = await binance.websockets.miniTicker((markets) => {
      marketsPrice = { ...markets };
      // trailingStop(markets[ticker].close);
      // console.log(markets[ticker]?.close);
    });
    subList = await binance.websockets.subscriptions();
  } catch (e) {
    console.log("error establishing websockets !miniTicker@arr");
  }
};
const terminateWebsocket = async (websocket) => {
  try {
    // const foo = await binance.websockets.subscriptions();
    // console.log("subscription check", foo);
    const response = await binance.websockets.terminate(websocket);
    subList = await binance.websockets.subscriptions();
  } catch (e) {
    console.log("error when terminating websocket");
  }
};
//***********************/
// initiate binance data
const BinanceTrading = async (symbol) => {
  try {
    let btcPrice = await checkSingle(symbol);
    let accountBalance = await checkAccountBalance();
    let orders = await openOrders();
    // websocketMiniTicker(symbol);
    // will add all pairs price here
    // spotPrice = await spotPrice();
    return {
      btcPrice: btcPrice,
      balance: accountBalance,
      openOrders: [...orders],
    };
  } catch (e) {
    console.log("calling account balance error ", e);
  }
};

export {
  BinanceTrading,
  cancelAllOrders,
  openOrders,
  checkAccountBalance,
  checkSingle,
  botController,
  toggleBot,
  checkBot,
};
