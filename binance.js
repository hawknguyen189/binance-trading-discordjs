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
let bot15m = new botConfig(1000, 200, [], "15m");
let bot30m = new botConfig(1000, 200, [], "30m");
let bot1h = new botConfig(1000, 200, [], "1h");
let bot4h = new botConfig(1000, 200, [], "4h");
console.log(bot15m, bot30m, bot1h, bot4h);
//**************** */
//configuring and running bots
const toggleBot = async () => {
  //switch bot on/off
  const response = "";
  if (botStatus) {
    botStatus = false;
    await terminateWebsocket("!miniTicker@arr");
    response = `bot is off now. Current budget is ${botConfig.initialBudget}.`;
  } else {
    botStatus = true;
    await websocketMiniTicker("BTCUSDT");
    response = `bot is running now. The default setting is: initial budget ${botConfig.initialBudget}; max single order ${botConfig.maxOrder}`;
  }
  return response;
};

const botController = async (signal) => {
  //check binance price
  let spotPrice = 0;
  try {
    spotPrice = await checkSingle(signal.ticker);
  } catch (e) {
    console.log(`error checking ${signal.ticker}`);
  }
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
      trailingStop(markets[ticker].close);
    });
  } catch (e) {
    console.log("error establishing websockets !miniTicker@arr");
  }
};
const terminateWebsocket = async (websocket) => {
  try {
    // const foo = await binance.websockets.subscriptions();
    // console.log("subscription check", foo);
    const response = await binance.websockets.terminate(websocket);
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
  foobar,
};
