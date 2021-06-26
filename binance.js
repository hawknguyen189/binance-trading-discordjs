import Binance from "node-binance-api";
import { config } from "dotenv";
config();

const binance = new Binance().options({
  APIKEY: process.env["BINANCE_API"],
  APISECRET: process.env["BINANCE_APISECRET"],
  useServerTime: true,
});

class botConfig {
  constructor(initialBudget, maxOrder, botHolding, botType) {
    //constructor function
    this.initialBudget = initialBudget;
    this.maxOrder = maxOrder;
    this.botHolding = botHolding;
    this.botType = botType;
  }
}
// var for global use
//run test on 15m, 30m, 1h, 4h
let botStatus = false;
let marketsPrice = {};
let subList = {};
let bot15m = new botConfig(1000, 200, [], "15m");
let bot30m = new botConfig(1000, 200, [], "30m");
let bot1h = new botConfig(1000, 200, [], "1h");
let bot4h = new botConfig(1000, 200, [], "4h");

//**************** */
//configuring and running bots
const toggleBot = async () => {
  //switch bot on/off
  const response = "";
  if (botStatus) {
    botStatus = false;
    await terminateWebsocket("!miniTicker@arr");
    // response = `bot is off now. Current budget is ${botConfig.initialBudget}.`;
  } else {
    botStatus = true;
    await websocketMiniTicker("BTCUSDT");
    // response = `bot is running now. The default setting is: initial budget ${botConfig.initialBudget}; max single order ${botConfig.maxOrder}`;
  }
  return response;
};

const checkBot = async () => {
  return botStatus
    ? `bot is running, websocket ${Object.keys(subList)[0]}`
    : "bot is not running";
};

const botController = async (signal) => {
  if (botStatus && signal.interval.length < 6) {
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
    }
    //check binance price
    let spotPrice = marketsPrice[signal.ticker].close;
    console.log("spot price is", spotPrice);
    console.log("interval is", signal.interval);
    const foundBot = eval("bot" + signal.interval);
    //check available balance & budget
    // const availBal = parseFloat(accountBalance.find(e => e.symbol === "USDT").available).toFixed(2);
    const availBal = foundbot.initialBudget; //use this for virtual run
    const threshold = 0.03; //default threshold is 3%
    if (signal.type.toUpperCase() === "BUY") {
      if (
        parseFloat(spotPrice[signal.ticker]).toFixed(5) <=
        parseFloat(signal.price) * (1 + threshold)
      ) {
        //buy the ticker or its corresponding leverage token on binance
        if (signal.ticker.includes("UPUSDT")) {
          //it's a leverage token
          foundbot.botHolding.push({
            ticker: signal.ticker,
            price: spotPrice[signal.ticker],
            amount: foundbot.maxOrder / spotPrice[signal.ticker],
          });
          foundbot.initialBudget -= foundbot.maxOrder;
          playChannel.send(
            `bot is buying ${signal.ticker} @ spot price ${parseFloat(
              spotPrice[signal.ticker]
            ).toFixed(2)} - total amount ${parseFloat(
              foundbot.maxOrder / spotPrice[signal.ticker]
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
          foundbot.botHolding.push({
            ticker: signal.ticker,
            price: spotPrice[signal.ticker],
            amount: foundbot.maxOrder / spotPrice[signal.ticker],
          });
          foundbot.initialBudget -= foundbot.maxOrder;
          playChannel.send(
            `bot is buying ${signal.ticker} @ spot price ${parseFloat(
              spotPrice[signal.ticker]
            ).toFixed(2)} - total amount ${parseFloat(
              foundbot.maxOrder / spotPrice[signal.ticker]
            ).toFixed(2)}`
          );
        } else {
          //not a leverage token
          console.log("It's not a leverage token");
        }
      }
    }
    console.log(foundBot);
    let botMessage = "Bot is holding: \n";
    // foundbot.botHolding.forEach(
    //   (e) =>
    //     (botMessage += `${e.ticker} @ ${parseFloat(e.price).toFixed(
    //       2
    //     )} - total amount ${parseFloat(e.amount).toFixed(2)} \n`)
    // );
    // botMessage += `Total budget ${foundbot.initialBudget}`;
    return botMessage;
  }
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

const trailingStop = (price) => {
  console.log("inside trailing stop", price);
};

const websocketMiniTicker = async (ticker) => {
  // this call future ticker stream
  //   const foo = await binance.futuresMiniTickerStream(ticker, (response) => {
  //     console.log(response, new Date().toLocaleTimeString());
  //   });
  //this will call complete 500 recent chart
  //   binance.websockets.chart(ticker, "1m", (symbol, interval, chart) => {
  //     let tick = binance.last(chart);
  //     const last = chart[tick].close;
  //     // console.info(chart);
  //     // Optionally convert 'chart' object to array:
  //     // let ohlc = binance.ohlc(chart);
  //     // console.info(symbol, ohlc);
  //     console.info(
  //       symbol + " last price: " + last,
  //       new Date().toLocaleTimeString()
  //     );
  //   });

  //   we only need simple spot price for a symbol so use this one
  //   binance.websockets.bookTickers(ticker, (response) => {
  //     console.log(response, new Date().toLocaleTimeString());
  //   });
  //no weight limit on websocket but 5 live stream/ip
  try {
    const response = await binance.websockets.miniTicker((markets) => {
      marketsPrice = { ...markets };
      // trailingStop(markets[ticker].close);
      console.log(markets[ticker]?.close);
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
