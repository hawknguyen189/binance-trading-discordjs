import fetch from "node-fetch";
const postMessageToDiscord = async (message) => {
  message = message || "Hello World!";

  var discordUrl =
    "https://discord.com/api/webhooks/851959636785496135/7dlAHw1y_IpHP-n-cuoiqxjCJrmg1uKv0DVBY_WUFZF99xL9dCDEk094tu-00qI1dOjx";
  var payload = JSON.stringify({ content: message });

  var params = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  };
  try {
    const response = await fetch(discordUrl, params);
    console.log(response);
  } catch (e) {
    console.log("posting message error", e);
  }
};

export { postMessageToDiscord };
