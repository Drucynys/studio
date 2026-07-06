const https = require('https');

https.get('https://api.pokemontcg.io/v2/cards?q=name:"Erika\'s Ivysaur"&pageSize=1', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const json = JSON.parse(data);
    if(json.data && json.data.length > 0) {
      console.log(JSON.stringify(json.data[0].tcgplayer.prices, null, 2));
    }
  });
});
