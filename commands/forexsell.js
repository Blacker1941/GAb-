import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

export const data = new SlashCommandBuilder()
  .setName('forexsell')
  .setDescription('📤 فروش آیتم به بازار فارکس')
  .addStringOption(option =>
    option.setName('item')
      .setDescription('نام آیتم (مثل: gold, oil یا پول ملی کشور)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('amount')
      .setDescription('تعداد برای فروش (عدد یا all)')
      .setRequired(true));

export async function execute(interaction, economy, saveEconomy, ensureUser, marketStats, countryData) {
  let deferred = false;
  try {
    await interaction.deferReply();
    deferred = true;

    const userId = interaction.user.id;
    const itemInput = interaction.options.getString('item').toLowerCase();
    const amountInput = interaction.options.getString('amount').toLowerCase();

    await ensureUser(userId);
    const user = economy[userId];

    const rawMarket = await fs.readFile('market.json', 'utf8');
    const market = JSON.parse(rawMarket);

    if (!market[itemInput]) {
      return await interaction.editReply({ content: '❌ چنین آیتمی در بازار وجود ندارد.', ephemeral: true });
    }

    const itemPrice = market[itemInput].price;
    const item = itemInput;

    user.forex = user.forex || {};
    const userAmount = user.forex[item] || 0;

    let amount;
    if (amountInput === 'all') {
      amount = userAmount;
      if (amount < 1) {
        return await interaction.editReply({ content: `❌ تو هیچ **${item.toUpperCase()}** نداری!`, ephemeral: true });
      }
    } else {
      amount = parseInt(amountInput);
      if (isNaN(amount) || amount < 1) {
        return await interaction.editReply({ content: '❌ تعداد واردشده نامعتبر است.', ephemeral: true });
      }
      if (userAmount < amount) {
        return await interaction.editReply({ content: `❌ تو فقط **${userAmount} ${item.toUpperCase()}** داری!`, ephemeral: true });
      }
    }

    const totalValue = amount * itemPrice;

    // کسر مقدار ارز از forex کاربر
    user.forex[item] -= amount;
    if (user.forex[item] < 0) user.forex[item] = 0;

    // آپدیت اطلاعات خرید برای محاسبه سود/ضرر
    user.forexBuyInfo = user.forexBuyInfo || {};
    if (user.forexBuyInfo[item]) {
      const buyInfo = user.forexBuyInfo[item];
      if (buyInfo.totalAmount > 0) {
        const sellRatio = amount / buyInfo.totalAmount;
        buyInfo.totalAmount -= amount;
        buyInfo.totalSpent -= buyInfo.totalSpent * sellRatio;
        if (buyInfo.totalAmount <= 0) {
          delete user.forexBuyInfo[item];
        } else {
          buyInfo.totalAmount = Math.max(0, buyInfo.totalAmount);
          buyInfo.totalSpent = Math.max(0, buyInfo.totalSpent);
        }
      }
    }

    // افزایش کیف پول عمومی (پول بین‌المللی)
    user.wallet = user.wallet || 0;
    user.wallet += totalValue;

    // ثبت آمار فروش در marketStats
    if (marketStats) {
      if (!marketStats[item]) {
        marketStats[item] = { buys: 0, sells: 0 };
      }
      marketStats[item].sells += amount;
    }

    await saveEconomy();

    await interaction.editReply(`✅ با موفقیت **${amount} ${item.toUpperCase()}** فروختی و **${totalValue.toFixed(2)}** پول دریافت کردی.`);
  } catch (err) {
    console.error('خطا در فروش:', err);
    try {
      if (deferred) {
        await interaction.editReply({ content: '❌ خطایی در فروش آیتم رخ داد.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ خطایی در فروش آیتم رخ داد.', ephemeral: true });
      }
    } catch (innerErr) {
      console.error('خطا در ارسال پیام خطا:', innerErr);
    }
  }
}
