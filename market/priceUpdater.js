import fs from 'fs/promises';

import { marketStats, loadMarketStats, saveMarketStats } from './marketStatsHandler.js';

const MARKET_FILE = 'market.json';

const CURRENCY_SENSITIVITY = 0.05;

export async function updateMarketPrices(economy, countryData) {

  try {

    await loadMarketStats();

    const raw = await fs.readFile(MARKET_FILE, 'utf8');

    const market = JSON.parse(raw);

    // ارزها

    for (const serverId in countryData.servers) {

      const currencyName = countryData.servers[serverId].currency.toLowerCase();

      if (!market[currencyName]) {

        market[currencyName] = {

          price: 0.1,

          history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }]

        };

        console.log(`🆕 ارز "${currencyName}" اضافه شد.`);

      }

    }

    // دارایی ارزها

    const currencyAssets = {};

    for (const userId in economy) {

      const userData = economy[userId];

      for (const serverId in countryData.servers) {

        const server = countryData.servers[serverId];

        const currencyName = server.currency.toLowerCase();

        const walletKey = `wallet${serverId}`;

        const amount = Number(userData[walletKey]);

        if (!isNaN(amount) && amount > 0) {

          if (!currencyAssets[currencyName]) {

            currencyAssets[currencyName] = { total: 0, holders: 0 };

          }

          currencyAssets[currencyName].total += amount;

          currencyAssets[currencyName].holders += 1;

        }

      }

    }

    // قیمت ارزها

    for (const currencyName in currencyAssets) {

      const stats = currencyAssets[currencyName];

      const history = market[currencyName].history;

      const lastCandle = history.at(-1) || { close: market[currencyName].price || 0.1 };

      const lastClose = lastCandle.close;

      const demandFactor = (stats.holders * 0.1) + (stats.total / 1000) * 0.05;

      let percentageChange = demandFactor * CURRENCY_SENSITIVITY;

      percentageChange = Math.max(-0.1, Math.min(0.1, percentageChange));

      const newClose = Math.max(0.001, parseFloat((lastClose * (1 + percentageChange)).toFixed(4)));

      const open = lastClose;

      const volatility = Math.max(0.001, newClose * 0.02);

      const high = parseFloat((Math.max(open, newClose) + Math.random() * volatility).toFixed(4));

      const low = parseFloat((Math.min(open, newClose) - Math.random() * volatility).toFixed(4));

      const newCandle = { open, high, low, close: newClose };

      history.push(newCandle);

      if (history.length > 72) history.splice(0, history.length - 72);

      market[currencyName].price = newClose;

      console.log(`💱 ${currencyName.toUpperCase()}: ${lastClose} → ${newClose} (${(percentageChange * 100).toFixed(2)}%)`);

    }

    // قیمت کالاها

    let oilChange = 0;

    let goldChange = 0;

    for (const item of ['gold', 'oil', 'diamond']) {

      if (!market[item]) continue;

      if (!marketStats[item]) {

        marketStats[item] = { buys: 0, sells: 0 };

      }

      const { buys, sells } = marketStats[item];

      const netDemand = buys - sells;

      const totalVolume = Math.max(buys + sells, 1);

      let percentageChange = (netDemand / totalVolume) * 0.3;

      percentageChange = Math.max(-0.8, Math.min(0.8, percentageChange));

      const history = market[item].history;

      const lastCandle = history.at(-1) || { close: market[item].price || 1 };

      const lastClose = lastCandle.close;

      let newClose = Math.max(1, Math.round(lastClose * (1 + percentageChange)));

      const volatility = Math.max(1, Math.round(newClose * 0.01));

      let high = Math.max(lastClose, newClose) + Math.floor(Math.random() * volatility);

      let low = Math.min(lastClose, newClose) - Math.floor(Math.random() * volatility);

      // الماس رفتار خاص

      if (item === 'diamond') {

        const rand = Math.random();

        if (rand < 0.10) {

          const dropPercentage = 0.2 + Math.random() * 0.3;

          const crashAmount = Math.round(lastClose * dropPercentage);

          newClose = Math.max(1, lastClose - crashAmount);

          low = Math.min(low, newClose - Math.floor(Math.random() * 3));

          console.log(`⚠️ ریزش ناگهانی DIAMOND: ${lastClose} → ${newClose}`);

        } else if (rand < 0.15) {

          const surgePercentage = 0.2 + Math.random() * 0.3;

          const surgeAmount = Math.round(lastClose * surgePercentage);

          newClose = lastClose + surgeAmount;

          high = Math.max(high, newClose + Math.floor(Math.random() * 3));

          console.log(`💥 رشد ناگهانی DIAMOND: ${lastClose} → ${newClose}`);

        }

      }

      const newCandle = { open: lastClose, high, low, close: newClose };

      history.push(newCandle);

      if (history.length > 72) history.splice(0, history.length - 72);

      market[item].price = newClose;

      marketStats[item] = { buys: 0, sells: 0 };

      // ثبت تغییر برای واکنش طلا/نفت

      if (item === 'oil') oilChange = percentageChange;

      if (item === 'gold') goldChange = percentageChange;

    }

    // واکنش نفت و طلا به هم

    if (oilChange > 0.3 && market['gold']) {

      const gold = market['gold'];

      const lastGold = gold.history.at(-1) || { close: gold.price || 100 };

      const drop = Math.min(0.3, oilChange * 0.7);

      const goldDrop = Math.round(lastGold.close * drop);

      const newGold = Math.max(1, lastGold.close - goldDrop);

      const newCandle = {

        open: lastGold.close,

        high: lastGold.close,

        low: newGold - Math.floor(Math.random() * 3),

        close: newGold

      };

      gold.history.push(newCandle);

      if (gold.history.length > 72) gold.history.splice(0, gold.history.length - 72);

      gold.price = newGold;

      console.log(`⚖️ رشد نفت باعث افت طلا شد: ${lastGold.close} → ${newGold}`);

    }

    if (goldChange > 0.3 && market['oil']) {

      const oil = market['oil'];

      const lastOil = oil.history.at(-1) || { close: oil.price || 100 };

      const drop = Math.min(0.3, goldChange * 0.7);

      const oilDrop = Math.round(lastOil.close * drop);

      const newOil = Math.max(1, lastOil.close - oilDrop);

      const newCandle = {

        open: lastOil.close,

        high: lastOil.close,

        low: newOil - Math.floor(Math.random() * 3),

        close: newOil

      };

      oil.history.push(newCandle);

      if (oil.history.length > 72) oil.history.splice(0, oil.history.length - 72);

      oil.price = newOil;

      console.log(`⚖️ رشد طلا باعث افت نفت شد: ${lastOil.close} → ${newOil}`);

    }

    await fs.writeFile(MARKET_FILE, JSON.stringify(market, null, 2));

    await saveMarketStats();

    console.log('✅ بازار با موفقیت آپدیت شد.');

  } catch (err) {

    console.error('❌ خطا در بروزرسانی بازار:', err);

  }

}