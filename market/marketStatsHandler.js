// ✅ marketStatsHandler.js

import fs from 'fs/promises';

import path from 'path';

const FILE_PATH = path.join(process.cwd(), './marketStats.json');

export let marketStats = {

  gold: { buys: 0, sells: 0 },

  oil: { buys: 0, sells: 0 },

  diamond: { buys: 0, sells: 0 }

};

export async function loadMarketStats() {

  try {

    const raw = await fs.readFile(FILE_PATH, 'utf8');

    const loaded = JSON.parse(raw);

    for (const key in loaded) {

      marketStats[key] = loaded[key];

    }

    console.log('✅ marketStats بارگذاری شد');

  } catch (err) {

    console.log('⚠️ فایل marketStats.json پیدا نشد یا خطا در بارگذاری، مقدار اولیه استفاده شد.');

  }

}

export async function saveMarketStats() {

  try {

    await fs.writeFile(FILE_PATH, JSON.stringify(marketStats, null, 2), 'utf8');

    console.log('✅ marketStats ذخیره شد');

  } catch (err) {

    console.error('❌ خطا در ذخیره marketStats:', err);

  }

}
