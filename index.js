// require the discord.js module
const Discord = require('discord.js');
const Binance = require("node-binance-api");
const dotenv = require("dotenv");
dotenv.config();

const binance = new Binance().options({
  APIKEY: process.env['BINANCE_API'],
  APISECRET: process.env['BINANCE_APISECRET'],
  useServerTime: true,
});

//**************** */
//calling Binance API
const checkSingle =  (symbol) => { //check single ticker price
    return  binance.prices(`${symbol.toUpperCase()}`);
};
const checkAccountBalance = async () => { //check account balance info
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

const openOrders = () => { //retrieve all openOrders
  return binance.openOrders();
}
const cancelAllOrders = async (symbol) => { //cancel all orders of a symbol
  await binance.cancelAll(symbol)
}  
//***********************/

//global var for temporary use
let ticker = {};
let accountBalance = {};
let orders;
let botStatus = false;
let botConfig = {
  initialBudget : 1000,
  maxOrder : 200,
  botHolding:[]
}
// ****

// initiate binance data
const BinanceTrading = async (symbol) => {
  ticker= await checkSingle(symbol);
  accountBalance = await checkAccountBalance();
  orders = await openOrders();
  // will add all pairs price here
  // spotPrice = await spotPrice();
  return {
    ticker:ticker,
    balance:accountBalance,
    // openOrders: [...orders]
  }; 
}


// create a new Discord client
const client = new Discord.Client();
let playChannel;
// inside a command, event listener, etc.

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', async () => {
	console.log('Ready!');
  console.log(await BinanceTrading("BTCUSDT")); //initiate data
  playChannel = client.channels.cache.find(channel => channel.name === "bot-playground")
});

client.on( 'message', async(message) => {
	if (message.content === '!ping') {
		// send back "Pong." to the channel the message was sent in
    // console.log(message)
    // console.log("pair", pair)
		playChannel.send('Pong.');
	} else if (message.content === '!callingCZ') { //check balance
    playChannel.send(`this is CZ ${ticker}`);
  } else if (message.content === '!budget'){
    playChannel.send(`You're holding`);
  } else if (message.content === '!openorders'){ //check open orders
    let botMessage = "";
    orders.forEach(e => botMessage += `order ${e.symbol} @ ${parseFloat(e.price).toFixed(2)} \n`)
    botMessage += `hit !cancelAllOrders to cancel all open orders`
    playChannel.send(botMessage);
  } else if (message.content === '!togglebot'){ //switch bot on/off
    if (botStatus){
      botStatus = false;
      playChannel.send(`bot is off now. Current budget is ${botConfig.initialBudget}.`);
    } else {
      botStatus = true;
      playChannel.send(`bot is running now. The default setting is: initial budget ${botConfig.initialBudget}; max single order ${botConfig.maxOrder}`);
    }
  }
  if (message.webhookID){
    // console.log(message.content)
    const temp = message.content.split(" ");
    const signal = {
      type: temp[0].substring(1),
      ticker: temp[1],
      interval: temp[2],
      price: parseFloat(temp[3]).toFixed(5),
      vol: parseFloat(temp[4]).toFixed(2)
    }
    console.log("signal is", signal)
    if (botStatus){
      //check binance price
      const spotPrice = await checkSingle(signal.ticker);
      console.log("spot price is",spotPrice)
      //check available balance & budget
      // const availBal = parseFloat(accountBalance.find(e => e.symbol === "USDT").available).toFixed(2);
      const availBal = botConfig.initialBudget ; //use this for virtual run
      const threshold = 0.03; //default threshold is 3%
      if (signal.type.toUpperCase() === "BUY") {
        if (parseFloat(spotPrice[signal.ticker]).toFixed(5) <= parseFloat(signal.price)*(1+threshold)){
          //buy the ticker or its corresponding leverage token on binance
          if (signal.ticker.includes("UPUSDT")){ //it's a leverage token
            botConfig.botHolding.push({
              ticker: signal.ticker,
              price: spotPrice[signal.ticker],
              amount: botConfig.maxOrder/spotPrice[signal.ticker]
            })
            botConfig.initialBudget -= botConfig.maxOrder;
            playChannel.send(`bot is buying ${signal.ticker} @ spot price ${parseFloat(spotPrice[signal.ticker]).toFixed(2)} - total amount ${parseFloat(botConfig.maxOrder/spotPrice[signal.ticker]).toFixed(2)}`)
          } else { //not a leverage token
            console.log("It's not a leverage token")
          }
        }
      } else { //type sell
        if (parseFloat(spotPrice[signal.ticker]).toFixed(5) >= parseFloat(signal.price)*(1+threshold)){
          //buy the ticker or its corresponding leverage token on binance
          if (signal.ticker.includes("DOWNUSDT")){ //it's a leverage token
            botConfig.botHolding.push({
              ticker: signal.ticker,
              price: spotPrice[signal.ticker],
              amount: botConfig.maxOrder/spotPrice[signal.ticker]
            })
            botConfig.initialBudget -= botConfig.maxOrder;
            playChannel.send(`bot is buying ${signal.ticker} @ spot price ${parseFloat(spotPrice[signal.ticker]).toFixed(2)} - total amount ${parseFloat(botConfig.maxOrder/spotPrice[signal.ticker]).toFixed(2)}`)
          } else { //not a leverage token
            console.log("It's not a leverage token")
          }
        }
      }
      console.log(botConfig);
      let botMessage = "Bot is holding: \n";
      botConfig.botHolding.forEach(e => botMessage += `${e.ticker} @ ${parseFloat(e.price).toFixed(2)} - total amount ${parseFloat(e.amount).toFixed(2)} \n`)
      botMessage += `Total budget ${botConfig.initialBudget}`
      playChannel.send(botMessage);
    }
  }
});

// login to Discord with your app's token
client.login(process.env['TOKEN']);