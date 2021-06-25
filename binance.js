import Binance from "node-binance-api";
import { config } from "dotenv";
config();

const binance = new Binance().options({
  APIKEY: process.env["BINANCE_API"],
  APISECRET: process.env["BINANCE_APISECRET"],
  useServerTime: true,
});

//**************** */
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

const websocketChart = async (ticker) => {
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
  binance.websockets.miniTicker((markets) => {
    trailingStop(markets[ticker].close);
  });
};

//***********************/

// initiate binance data
const BinanceTrading = async (symbol) => {
  try {
    let btcPrice = await checkSingle(symbol);
    let accountBalance = await checkAccountBalance();
    let orders = await openOrders();
    // websocketChart(symbol);
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
};
