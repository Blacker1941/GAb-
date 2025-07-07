import fs from 'fs/promises';
import { marketStats, loadMarketStats, saveMarketStats } from './marketStatsHandler.js';

const MARKET_FILE = './market.json';
const COUNTRY_FILE = './countriesData.json';

function normalizeCurrencyName(rawCurrency) {
  if (!rawCurrency) return '';
  return rawCurrency.trim().toLowerCase();
}

export async function updateMarketPrices(economy, countriesData) {
  try {
    await loadMarketStats();

    const rawMarket = await fs.readFile(MARKET_FILE, 'utf8');
    const market = JSON.parse(rawMarket);

    // حذف کشورهایی که شهروند ندارند (به‌جز کشور اصلی)
    for (const serverId in countriesData.servers) {
      const server = countriesData.servers[serverId];

      if (server.isMain === true) continue;
      if (!server.citizens || server.citizens.length === 0) {
        const currencyName = normalizeCurrencyName(server.currency);
        console.log(`🗑️ حذف کشور "${server.country}" (ServerID: ${serverId}) به دلیل نداشتن شهروند.`);
        delete countriesData.servers[serverId];

        if (
          currencyName &&
          !['طلا', 'نفت', 'الماس', 'gold', 'oil', 'diamond'].includes(currencyName)
        ) {
          const usedElsewhere = Object.values(countriesData.servers).some(s =>
            normalizeCurrencyName(s.currency) === currencyName
          );
          if (!usedElsewhere && market[currencyName]) {
            delete market[currencyName];
            console.log(`💸 ارز مرتبط "${currencyName}" نیز حذف شد.`);
          }
        }
      }
    }

    const globalTrend = (Math.random() - 0.5) * 0.4;
    console.log(
      `📈 روند کلی بازار: ${
        globalTrend > 0.01 ? 'صعودی' : globalTrend < -0.01 ? 'نزولی' : 'ثابت'
      }`
    );

    // اضافه کردن ارز کشورها به مارکت در صورت نبود
    for (const serverId in countriesData.servers) {
      const currencyName = normalizeCurrencyName(countriesData.servers[serverId].currency);
      if (currencyName && !market[currencyName]) {
        market[currencyName] = {
          price: 0.1,
          history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }],
          activity: {
            localTransactions: 0,
            externalDemand: 0,
            totalMoney: 0,
            citizenCount: 0,
          },
        };
        console.log(`🆕 ارز "${currencyName}" اضافه شد.`);
      }
    }

    // به‌روزرسانی فعالیت‌ها برای هر ارز
    for (const serverId in countriesData.servers) {
      const server = countriesData.servers[serverId];
      const currency = normalizeCurrencyName(server.currency);
      if (!currency || !market[currency]) continue;

      const citizens = server.citizens.length;
      const activity = server.economicActivity || { transactionCount: 0, workCount: 0 };

      if (!market[currency].activity) {
        market[currency].activity = {
          localTransactions: 0,
          externalDemand: 0,
          totalMoney: 0,
          citizenCount: 0,
        };
      }

      market[currency].activity.localTransactions = activity.transactionCount + activity.workCount;
      market[currency].activity.citizenCount = citizens;
    }

    // جمع‌آوری اطلاعات دارایی کاربران بر اساس ارز
    const currencyAssets = {};

    for (const userId in economy) {
      const userData = economy[userId];

      for (const serverId in countriesData.servers) {
        const server = countriesData.servers[serverId];
        const currencyName = normalizeCurrencyName(server.currency);
        if (!currencyName) continue;

        const walletKey = `wallet${serverId}`;
        const amount = Number(userData[walletKey]);
        if (isNaN(amount)) continue;

        if (!currencyAssets[currencyName]) {
          currencyAssets[currencyName] = { total: 0, holders: 0 };
        }

        currencyAssets[currencyName].total += amount;
        if (amount > 0) currencyAssets[currencyName].holders += 1;
      }
    }

    // به‌روزرسانی قیمت‌ها بر اساس داده‌های فعالیت و دارایی
    for (const currencyName in currencyAssets) {
      if (!market[currencyName]) {
        console.log(`⚠️ هشدار: ارز ${currencyName} در مارکت موجود نیست، رد شد.`);
        continue;
      }

      const stats = currencyAssets[currencyName];
      const activity = market[currencyName].activity;
      const history = market[currencyName].history;
      const lastCandle = history.at(-1) || { close: market[currencyName].price || 0.1 };
      const lastClose = lastCandle.close;

      const transactionPower = activity.localTransactions / (activity.citizenCount || 1);
      const externalBoost = activity.externalDemand * 0.02;
      const inflationPressure = stats.total / (activity.citizenCount * 1000 || 1);

      let changePercent =
        transactionPower * 0.02 + externalBoost - inflationPressure * 0.015 + globalTrend;

      if (activity.localTransactions === 0 && stats.total < 100) {
        changePercent += (Math.random() - 0.5) * 0.01;
      }

      changePercent = Math.max(-0.05, Math.min(0.05, changePercent));

      const newClose = Math.max(0.001, parseFloat((lastClose * (1 + changePercent)).toFixed(4)));
      const open = lastClose;
      const volatility = Math.max(0.001, newClose * 0.02);
      const high = parseFloat((Math.max(open, newClose) + Math.random() * volatility).toFixed(4));
      const low = parseFloat((Math.min(open, newClose) - Math.random() * volatility).toFixed(4));

      const newCandle = { open, high, low, close: newClose };
      history.push(newCandle);
      if (history.length > 72) history.splice(0, history.length - 72);
      market[currencyName].price = newClose;
    }

    // مدیریت کالاهای اصلی: طلا، نفت، الماس
    let oilChange = 0;
    let goldChange = 0;

    for (const item of ['gold', 'oil', 'diamond']) {
      if (!market[item]) continue;
      if (!marketStats[item]) marketStats[item] = { buys: 0, sells: 0 };

      const { buys, sells } = marketStats[item];
      const netDemand = buys - sells;
      const totalVolume = Math.max(buys + sells, 1);

      let baseChange = (netDemand / totalVolume) * 0.15;
      let percentageChange = baseChange + globalTrend;

      marketStats[item].momentum = (marketStats[item].momentum || 0) * 0.7 + percentageChange * 0.3;
      percentageChange += marketStats[item].momentum * 0.2;

      percentageChange = Math.max(-0.2, Math.min(0.2, percentageChange));

      const history = market[item].history;
      const lastCandle = history.at(-1) || { close: market[item].price || 1 };
      const lastClose = lastCandle.close;

      let newClose = Math.max(1, Math.round(lastClose * (1 + percentageChange)));
      const volatility = Math.max(1, Math.round(newClose * 0.01));
      let high = Math.max(lastClose, newClose) + Math.floor(Math.random() * volatility);
      let low = Math.min(lastClose, newClose) - Math.floor(Math.random() * volatility);

      if (item === 'diamond') {
        const rand = Math.random();
        if (rand < 0.1) {
          const drop = Math.round(lastClose * (0.2 + Math.random() * 0.3));
          newClose = Math.max(1, lastClose - drop);
          low = newClose - Math.floor(Math.random() * 3);
          console.log(`⚠️ ریزش ناگهانی DIAMOND: ${lastClose} → ${newClose}`);
        } else if (rand < 0.15) {
          const surge = Math.round(lastClose * (0.2 + Math.random() * 0.3));
          newClose = lastClose + surge;
          high = newClose + Math.floor(Math.random() * 3);
          console.log(`💥 رشد ناگهانی DIAMOND: ${lastClose} → ${newClose}`);
        }
      }

      const newCandle = { open: lastClose, high, low, close: newClose };
      history.push(newCandle);
      if (history.length > 72) history.splice(0, history.length - 72);
      market[item].price = newClose;

      marketStats[item].buys = 0;
      marketStats[item].sells = 0;

      if (item === 'oil') oilChange = percentageChange;
      if (item === 'gold') goldChange = percentageChange;
    }

    if (oilChange > 0.3 && market['gold']) {
      const gold = market['gold'];
      const lastGold = gold.history.at(-1) || { close: gold.price || 100 };
      const drop = Math.round(lastGold.close * Math.min(0.3, oilChange * 0.7));
      const newGold = Math.max(1, lastGold.close - drop);
      const newCandle = { open: lastGold.close, high: lastGold.close, low: newGold - 2, close: newGold };
      gold.history.push(newCandle);
      if (gold.history.length > 72) gold.history.splice(0, gold.history.length - 72);
      gold.price = newGold;
      console.log(`⚖️ رشد نفت باعث افت طلا شد: ${lastGold.close} → ${newGold}`);
    }

    if (goldChange > 0.3 && market['oil']) {
      const oil = market['oil'];
      const lastOil = oil.history.at(-1) || { close: oil.price || 100 };
      const drop = Math.round(lastOil.close * Math.min(0.3, goldChange * 0.7));
      const newOil = Math.max(1, lastOil.close - drop);
      const newCandle = { open: lastOil.close, high: lastOil.close, low: newOil - 2, close: newOil };
      oil.history.push(newCandle);
      if (oil.history.length > 72) oil.history.splice(0, oil.history.length - 72);
      oil.price = newOil;
      console.log(`⚖️ رشد طلا باعث افت نفت شد: ${lastOil.close} → ${newOil}`);
    }

    // حذف ارزهای بی‌صاحب از مارکت
    const validCurrencies = new Set(
      Object.values(countriesData.servers)
        .map(s => normalizeCurrencyName(s.currency))
        .filter(Boolean)
    );

    for (const currencyName in market) {
      if (
        !validCurrencies.has(currencyName) &&
        !['gold', 'oil', 'diamond', 'طلا', 'نفت', 'الماس'].includes(currencyName)
      ) {
        delete market[currencyName];
        console.log(`🗑️ ارز بی‌صاحب "${currencyName}" از مارکت حذف شد.`);
      }
    }

    await fs.writeFile(MARKET_FILE, JSON.stringify(market, null, 2));
    await fs.writeFile(COUNTRY_FILE, JSON.stringify(countriesData, null, 2));
    await saveMarketStats();

    console.log('✅ بازار با موفقیت آپدیت شد.');
  } catch (err) {
    console.error('❌ خطا در بروزرسانی بازار:', err);
  }
}
