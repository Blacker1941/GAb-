import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';

export const data = new SlashCommandBuilder()
  .setName('wallet')
  .setDescription('👛 نمایش دارایی‌های فارکس با قیمت لحظه‌ای')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('کاربری که می‌خواهی ولتش رو ببینی')
      .setRequired(false));

export async function execute(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') || interaction.user;

  // جلوگیری از مشاهده ولت ربات‌ها
  if (targetUser.bot) {
    return await interaction.editReply('🤖 نمی‌توان ولت ربات‌ها را مشاهده کرد.');
  }

  const userId = targetUser.id;

  try {
    const [usersRaw, marketRaw] = await Promise.all([
      fs.readFile('economy.json', 'utf8'),
      fs.readFile('market.json', 'utf8')
    ]);

    const users = JSON.parse(usersRaw);
    const market = JSON.parse(marketRaw);

    const user = users[userId];

    if (!user || !user.forex) {
      return await interaction.editReply(`📭 ${targetUser.username} هیچ دارایی فارکس ندارد.`);
    }

    const forex = user.forex;
    let totalValue = 0;

    const embed = new EmbedBuilder()
      .setTitle(`👛 دارایی‌های فارکس ${targetUser.username}`)
      .setColor(0x00cc99)
      .setTimestamp();

    for (const item in forex) {
      const amount = forex[item];
      if (amount <= 0) continue;

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
        value: `تعداد: **${amount}**\nقیمت فعلی: **${price}**\nارزش: **${value.toFixed(2)}**\n${profitText}`,
        inline: true
      });
    }

    embed.addFields({
      name: '💰 مجموع ارزش فارکس',
      value: `**${totalValue.toFixed(2)}**`,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ خطا در /wallet:', err);
    await interaction.editReply('❌ خطایی در خواندن اطلاعات رخ داد.');
  }
}
