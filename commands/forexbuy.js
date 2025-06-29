// ✅ forexBuy command
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

    let item = itemInput;
    let isUserNationalCurrency = false;
    let walletKeyForNationalCurrency = null;

    for (const serverId in countryData.servers) {
      const server = countryData.servers[serverId];
      const currencyName = server.currency?.toLowerCase();
      const currencyImageText = server.currencyImage?.toLowerCase() || '';
      const aliases = [currencyName];
      if (currencyImageText.includes('|')) {
        aliases.push(...currencyImageText.split('|').map(s => s.trim()));
      }
      if (aliases.includes(itemInput)) {
        item = currencyName;
        if (!market[item]) {
          market[item] = {
            price: 0.1,
            history: [{ open: 0.1, high: 0.1, low: 0.1, close: 0.1 }]
          };
        }
        if (server.citizens.includes(userId)) {
          isUserNationalCurrency = true;
          walletKeyForNationalCurrency = 'wallet' + serverId;
          user[walletKeyForNationalCurrency] = user[walletKeyForNationalCurrency] || 0;
        }
        break;
      }
    }

    if (!market[item]) return await interaction.editReply({ content: '❌ چنین آیتمی در بازار نیست.', ephemeral: true });

    const itemPrice = market[item].price;
    let amount = amountInput === 'all' ? Math.floor(user.wallet / itemPrice) : parseInt(amountInput);
    if (isNaN(amount) || amount < 1 || user.wallet < amount * itemPrice)
      return await interaction.editReply({ content: '❌ مقدار نامعتبر یا پول ناکافی.', ephemeral: true });

    user.wallet -= amount * itemPrice;
    user.forex = user.forex || {};
    user.forex[item] = (user.forex[item] || 0) + amount;
    user.forexBuyInfo = user.forexBuyInfo || {};
    user.forexBuyInfo[item] = user.forexBuyInfo[item] || { totalAmount: 0, totalSpent: 0 };
    user.forexBuyInfo[item].totalAmount += amount;
    user.forexBuyInfo[item].totalSpent += amount * itemPrice;
    if (isUserNationalCurrency) user[walletKeyForNationalCurrency] = user.forex[item];

    marketStats[item] = marketStats[item] || { buys: 0, sells: 0 };
    marketStats[item].buys += amount;
    await saveMarketStats();
    await saveEconomy();
    await fs.writeFile('market.json', JSON.stringify(market, null, 2));

    await interaction.editReply(`✅ خرید ${amount} ${item.toUpperCase()} با ${amount * itemPrice} انجام شد.`);
  } catch (err) {
    console.error('❌ خطا در خرید:', err);
    if (deferred) await interaction.editReply({ content: '❌ خطا در خرید.', ephemeral: true });
  }
}
