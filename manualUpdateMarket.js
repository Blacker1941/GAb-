import fs from 'fs/promises';

const marketStats = {
  gold: { buys: 0, sells: 0 },
  oil: { buys: 0, sells: 0 },
  diamond: { buys: 0, sells: 0 }
};

const CURRENCY_SENSITIVITY = 0.0001;

async function updateMarketPrices(economy, countryData) {
  try {
    const raw = await fs.readFile('market.json', 'utf8');
    const market = JSON.parse(raw);

    // ۰. اطمینان از وجود ارزهای ملی
    for (const serverId in countryData.servers) {
      const currencyName = countryData.servers[serverId].currency.toLowerCase();
      if (!market[currencyName]) {
        market[currencyName] = {
          price: 0.1,
          history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }]
        };
        console.log(`🆕 ارز جدید "${currencyName}" به بازار اضافه شد.`);
      }
    }

    // ۱. محاسبه دارایی کل هر ارز و تعداد دارنده‌ها
    const currencyAssets = {};
    for (const userId in economy) {
      const userData = economy[userId];
      for (const serverId in countryData.servers) {
        const server = countryData.servers[serverId];
        const currencyName = server.currency.toLowerCase();
        const walletKey = `wallet${serverId}`;

        if (userData[walletKey] && userData[walletKey] > 0) {
          if (!currencyAssets[currencyName]) {
            currencyAssets[currencyName] = { total: 0, holders: 0 };
          }
          currencyAssets[currencyName].total += userData[walletKey];
          currencyAssets[currencyName].holders += 1;
        }
      }
    }

    // ۲. بروزرسانی قیمت ارزها
    for (const currencyName in currencyAssets) {
      if (!market[currencyName]) {
        market[currencyName] = {
          price: 0.1,
          history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }]
        };
        console.log(`🆕 ارز جدید "${currencyName}" به بازار اضافه شد.`);
      }

      const stats = currencyAssets[currencyName];
      const lastCandle = market[currencyName].history.slice(-1)[0];
      const lastClose = lastCandle.close;

      let demandFactor = (stats.holders * 0.01) + (stats.total / 1000) * 0.001;

      let percentageChange = demandFactor * CURRENCY_SENSITIVITY;
      percentageChange = Math.min(0.05, Math.max(-0.05, percentageChange));

      const newClose = Math.max(0.001, lastClose * (1 + percentageChange));

      const open = lastClose;
      const volatility = newClose * 0.01;
      const high = Math.max(open, newClose) + Math.random() * volatility;
      const low = Math.min(open, newClose) - Math.random() * volatility;

      const newCandle = {
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(newClose.toFixed(4))
      };

      market[currencyName].history.push(newCandle);
      if (market[currencyName].history.length > 24) {
        market[currencyName].history = market[currencyName].history.slice(-24);
      }

      market[currencyName].price = newClose;
    }

    // ۳. بروزرسانی قیمت کالاها
    for (const item of ['gold', 'oil', 'diamond']) {
      if (!market[item]) continue;
      const stats = marketStats[item] || { buys: 0, sells: 0 };
      const { buys, sells } = stats;
      const netDemand = buys - sells;
      const sensitivity = 0.01;
      let percentageChange = netDemand * sensitivity;
      percentageChange = Math.max(Math.min(percentageChange, 0.05), -0.05);

      const lastCandle = market[item].history[market[item].history.length - 1];
      const lastClose = lastCandle.close;

      const newClose = Math.max(1, Math.round(lastClose * (1 + percentageChange)));

      const open = lastClose;
      const volatility = Math.round(newClose * 0.01);
      const high = Math.max(open, newClose) + Math.floor(Math.random() * volatility);
      const low = Math.min(open, newClose) - Math.floor(Math.random() * volatility);

      const newCandle = {
        open,
        high: Math.max(low, high),
        low: Math.min(low, high),
        close: newClose
      };

      market[item].history.push(newCandle);
      if (market[item].history.length > 24) {
        market[item].history = market[item].history.slice(-24);
      }

      market[item].price = newClose;

      marketStats[item] = { buys: 0, sells: 0 };
    }

    await fs.writeFile('market.json', JSON.stringify(market, null, 2));
    console.log('📈 قیمت‌های بازار فارکس یک ساعت به جلو بروزرسانی شد.');
  } catch (err) {
    console.error('❌ خطا در بروزرسانی بازار:', err);
  }
}

async function main() {
  try {
    const economyRaw = await fs.readFile('economy.json', 'utf8');
    const countryRaw = await fs.readFile('countriesData.json', 'utf8');
    const economy = JSON.parse(economyRaw);
    const countryData = JSON.parse(countryRaw);

    await updateMarketPrices(economy, countryData);
  } catch (err) {
    console.error('❌ خطا در بارگذاری داده‌ها:', err);
  }
}

main();
