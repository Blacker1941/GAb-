import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

const filePath = './countriesData.json';

export const data = new SlashCommandBuilder()
  .setName('setcountrymeta')
  .setDescription('📷 تنظیم تصاویر نماد، پرچم، واحد پول و لینک دیسکورد کشور')
  .addStringOption(option =>
    option.setName('symbol')
      .setDescription('لینک عکس نماد کشور')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('flag')
      .setDescription('لینک عکس پرچم کشور')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('currency')
      .setDescription('لینک عکس واحد پول کشور')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('discord')
      .setDescription('لینک دعوت دیسکورد کشور')
      .setRequired(false));

export async function execute(interaction) {
  const serverId = interaction.guild.id;
  const userId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    const guildOwner = await interaction.guild.fetchOwner();
    if (userId !== guildOwner.id) {
      return await interaction.editReply({ content: '❌ فقط اونر سرور می‌تونه اطلاعات کشور رو تنظیم کنه.' });
    }

    // بارگذاری اطلاعات
    let data;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(raw);
    } catch {
      data = { servers: {} };
    }

    if (!data.servers[serverId]) {
      return await interaction.editReply({ content: '❌ ابتدا باید با دستور `/createcountry` کشور را بسازی.' });
    }

    const symbol = interaction.options.getString('symbol');
    const flag = interaction.options.getString('flag');
    const currency = interaction.options.getString('currency');
    const discord = interaction.options.getString('discord');

    if (symbol) data.servers[serverId].symbolImage = symbol;
    if (flag) data.servers[serverId].flagImage = flag;
    if (currency) data.servers[serverId].currencyImage = currency;
    if (discord) data.servers[serverId].discordLink = discord;

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    await interaction.editReply('✅ اطلاعات نماد، پرچم، واحد پول یا لینک دیسکورد با موفقیت ذخیره شد.');
  } catch (err) {
    console.error('❌ خطا در ذخیره متا:', err);
    await interaction.editReply({ content: '❌ خطایی در ذخیره اطلاعات کشور رخ داد.' });
  }
}
