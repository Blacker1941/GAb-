import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import Canvas from 'canvas';

export const data = new SlashCommandBuilder()
  .setName('forexmarket')
  .setDescription('📈 نمایش چارت کندلی یک آیتم از بازار فارکس')
  .addStringOption(option =>
    option
      .setName('item')
      .setDescription('آیتم مورد نظر (مثلاً gold یا oil یا پول ملی کشور)')
      .setRequired(true)
  );

function normalizeCurrencyName(name) {
  return name?.trim().toLowerCase() || '';
}

export async function execute(interaction) {
  const item = normalizeCurrencyName(interaction.options.getString('item'));
  await interaction.deferReply();

  try {
    const [marketRaw, economyRaw, countriesRaw] = await Promise.all([
      fs.promises.readFile('market.json', 'utf8'),
      fs.promises.readFile('economy.json', 'utf8'),
      fs.promises.readFile('countriesData.json', 'utf8')
    ]);

    const market = JSON.parse(marketRaw);
    const users = JSON.parse(economyRaw);
    const countriesData = JSON.parse(countriesRaw);

    // اگر ارز در مارکت نیست ولی در ارز کشورهای موجود است، اضافه‌اش کن
    const isCurrencyInCountries = Object.values(countriesData.servers || {}).some(
      s => normalizeCurrencyName(s.currency) === item
    );

    if (!market[item] && isCurrencyInCountries) {
      market[item] = {
        price: 0.1,
        history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }],
        activity: {
          localTransactions: 0,
          externalDemand: 0,
          totalMoney: 0,
          citizenCount: 0,
        }
      };
      await fs.promises.writeFile('market.json', JSON.stringify(market, null, 2));
      console.log(`🆕 ارز "${item}" به مارکت اضافه شد.`);
    }

    if (!market[item] || !Array.isArray(market[item].history)) {
      return await interaction.editReply({ content: '❌ آیتم مورد نظر در بازار وجود ندارد یا داده‌ها نامعتبرند.' });
    }

    const candles = market[item].history.slice(-72);
    const width = 700;
    const height = 340;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // پس‌زمینه
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // عنوان
    ctx.fillStyle = '#FFD700';
    ctx.font = '20px sans-serif';
    ctx.fillText(`📊 ${item.toUpperCase()} Market - Candlestick Chart`, 20, 30);

    const chartX = 50;
    const chartY = 50;
    const chartWidth = width - 100;
    const chartHeight = height - 100;

    // محور
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartHeight);
    ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
    ctx.stroke();

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const yScale = chartHeight / (max - min || 1);
    const xStep = chartWidth / candles.length;

    // قیمت فعلی
    const currentPrice = candles[candles.length - 1].close;
    const currentY = chartY + chartHeight - (currentPrice - min) * yScale;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#8888FF';
    ctx.beginPath();
    ctx.moveTo(chartX, currentY);
    ctx.lineTo(chartX + chartWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8888FF';
    ctx.font = '19px sans-serif';
    ctx.fillText(`$${currentPrice}`, chartX + chartWidth + 5, currentY + 5);

    // برچسب‌های قیمت سمت راست
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const p = min + ((max - min) / priceSteps) * i;
      const y = chartY + chartHeight - (p - min) * yScale;
      ctx.beginPath();
      ctx.moveTo(chartX - 4, y);
      ctx.lineTo(chartX, y);
      ctx.stroke();
      ctx.fillText(`$${Math.round(p)}`, chartX + chartWidth + 5, y + 4);
    }

    // تاریخ کندل‌ها
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - candles.length + 1);
    function formatDate(date) {
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[date.getMonth()]}`;
    }

    // رسم کندل‌ها
    candles.forEach((candle, i) => {
      const x = chartX + i * xStep + xStep / 4;
      const candleWidth = xStep / 2;

      const openY = chartY + chartHeight - (candle.open - min) * yScale;
      const closeY = chartY + chartHeight - (candle.close - min) * yScale;
      const highY = chartY + chartHeight - (candle.high - min) * yScale;
      const lowY = chartY + chartHeight - (candle.low - min) * yScale;

      const isBull = candle.close >= candle.open;
      ctx.fillStyle = isBull ? '#00ff88' : '#ff4444';
      ctx.strokeStyle = ctx.fillStyle;

      const bodyY = isBull ? closeY : openY;
      const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
      ctx.fillRect(x, bodyY, candleWidth, bodyHeight);

      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '10px sans-serif';
      const candleDate = new Date(startDate);
      candleDate.setDate(startDate.getDate() + i);
      ctx.fillText(formatDate(candleDate), x, chartY + chartHeight + 15);
    });

    // خط خرید کاربر (اگر وجود داشته باشد)
    const userId = interaction.user.id;
    const user = users[userId];
    if (user && user.forexBuyInfo && user.forexBuyInfo[item]) {
      const buyInfo = user.forexBuyInfo[item];
      const avgBuyPrice = buyInfo.totalSpent / buyInfo.totalAmount;
      if (avgBuyPrice >= min && avgBuyPrice <= max) {
        const buyY = chartY + chartHeight - (avgBuyPrice - min) * yScale;
        ctx.strokeStyle = '#AA00FF';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(chartX, buyY);
        ctx.lineTo(chartX + chartWidth, buyY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#AA00FF';
        ctx.font = '16px sans-serif';
        ctx.fillText(`💵 خرید: $${avgBuyPrice.toFixed(2)}`, chartX + chartWidth + 5, buyY + 5);
      }
    }

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: `${item}_candlestick_chart.png` });

    await interaction.editReply({
      content: `📈 نمودار کندلی ${item.toUpperCase()} در ۷۲ روز گذشته:`,
      files: [attachment]
    });

  } catch (err) {
    console.error('❌ خطا در رسم چارت:', err);
    await interaction.editReply({ content: 'خطایی در خواندن یا رسم چارت بازار رخ داد.' });
  }
}
