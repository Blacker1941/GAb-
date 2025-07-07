import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import { saveMarketStats } from '../market/marketStatsHandler.js';

export const data = new SlashCommandBuilder()
  .setName('forexbuy')
  .setDescription('📥 خرید ارز یا کالا از بازار فارکس')
  .addStringOption(option => option.setName('item').setDescription('نام آیتم').setRequired(true))
  .addStringOption(option => option.setName('amount').setDescription('تعداد (عدد یا all)').setRequired(true));

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
      return await interaction.editReply({ content: '❌ چنین آیتمی در بازار نیست.', ephemeral: true });
    }

    const itemPrice = market[itemInput].price;

    // مقدار خرید
    let amount = amountInput === 'all' ? Math.floor(user.wallet / itemPrice) : parseInt(amountInput);
    if (isNaN(amount) || amount < 1) {
      return await interaction.editReply({ content: '❌ مقدار نامعتبر است.', ephemeral: true });
    }

    if (user.wallet < amount * itemPrice) {
      return await interaction.editReply({ content: '❌ پول بین‌المللی کافی نیست.', ephemeral: true });
    }

    // کم کردن پول بین المللی
    user.wallet -= amount * itemPrice;

    // اضافه کردن مقدار به دارایی فارکس کاربر
    user.forex = user.forex || {};
    user.forex[itemInput] = (user.forex[itemInput] || 0) + amount;

    // ثبت اطلاعات خرید
    user.forexBuyInfo = user.forexBuyInfo || {};
    user.forexBuyInfo[itemInput] = user.forexBuyInfo[itemInput] || { totalAmount: 0, totalSpent: 0 };
    user.forexBuyInfo[itemInput].totalAmount += amount;
    user.forexBuyInfo[itemInput].totalSpent += amount * itemPrice;

    // ثبت آمار خرید
    marketStats[itemInput] = marketStats[itemInput] || { buys: 0, sells: 0 };
    marketStats[itemInput].buys += amount;

    await saveMarketStats();
    await saveEconomy();

    await interaction.editReply(`✅ خرید ${amount} ${itemInput.toUpperCase()} با موفقیت انجام شد و از کیف پول بین‌المللی شما کسر شد.`);
  } catch (err) {
    console.error('❌ خطا در خرید:', err);
    if (deferred) await interaction.editReply({ content: '❌ خطا در خرید.', ephemeral: true });
  }
}
