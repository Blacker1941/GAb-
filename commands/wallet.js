import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';

export const data = new SlashCommandBuilder()
  .setName('wallet') // یا .setName('ولت')
  .setDescription('👛 نمایش دارایی‌های فارکس شما با قیمت لحظه‌ای');

export async function execute(interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;

  try {
    // لود اطلاعات کاربران و بازار
    const [usersRaw, marketRaw] = await Promise.all([
      fs.readFile('economy.json', 'utf8'),
      fs.readFile('market.json', 'utf8')
    ]);

    const users = JSON.parse(usersRaw);
    const market = JSON.parse(marketRaw);

    const user = users[userId];

    if (!user || !user.forex) {
      return await interaction.editReply('📭 شما هیچ دارایی فارکس ندارید.');
    }

    const forex = user.forex;
    let totalValue = 0;

    const embed = new EmbedBuilder()
      .setTitle(`👛 دارایی‌های فارکس ${interaction.user.username}`)
      .setColor(0x00cc99)
      .setTimestamp();

    for (const item in forex) {
      const amount = forex[item];
      if (amount <= 0) continue;  // فقط نمایش دارایی‌هایی که مقدارشون بزرگ‌تر از صفره

      const price = market[item]?.price || 0;
      const value = amount * price;
      totalValue += value;

      const buyInfo = user.forexBuyInfo?.[item];
      let profitText = '⏳ اطلاعات خرید ثبت نشده';

      if (buyInfo && buyInfo.totalAmount > 0) {
        const avgBuyPrice = buyInfo.totalSpent / buyInfo.totalAmount;
        const profitPerUnit = price - avgBuyPrice;
        const totalProfit = profitPerUnit * amount;
        const percent = ((price - avgBuyPrice) / avgBuyPrice * 100).toFixed(2);

        const emoji = totalProfit >= 0 ? '📈' : '📉';
        profitText = `${emoji} سود/ضرر: **${totalProfit.toFixed(2)}** (${percent}%)`;
      }

      embed.addFields({
        name: `💱 ${item.toUpperCase()}`,
        value: `تعداد: **${amount}**\nقیمت فعلی: **${price}**\nارزش: **${value}**\n${profitText}`,
        inline: true
      });
    }

    embed.addFields({
      name: '💰 مجموع ارزش فارکس',
      value: `**${totalValue}**`,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ خطا در /wallet:', err);
    await interaction.editReply('❌ خطایی در خواندن اطلاعات رخ داد.');
  }
}
