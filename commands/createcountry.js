import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';

const filePath = './countriesData.json';

export const data = new SlashCommandBuilder()
  .setName('createcountry')
  .setDescription('🌍 ایجاد یک کشور جدید برای این سرور (فقط توسط اونر)')
  .addStringOption(option =>
    option.setName('name')
      .setDescription('نام کشور (منحصربه‌فرد)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('ideology')
      .setDescription('ایدئولوژی کشور (مثلاً دموکراسی، سلطنت، فاشیسم...)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('currency')
      .setDescription('واحد پول کشور (مثل: تومان، دلار، سکه...)')
      .setRequired(true));

export async function execute(interaction) {
  const serverId = interaction.guild.id;
  const userId = interaction.user.id;
  const countryName = interaction.options.getString('name');
  const ideology = interaction.options.getString('ideology');
  const currency = interaction.options.getString('currency');

  await interaction.deferReply({ ephemeral: true }); // ✅ جلوگیری از خطای تعامل

  try {
    // بررسی اونر بودن
    const guildOwner = await interaction.guild.fetchOwner();
    if (userId !== guildOwner.id) {
      return await interaction.editReply({ content: '❌ فقط اونر سرور می‌تونه کشور بسازه.' });
    }

    // خواندن داده
    let data;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      data = JSON.parse(raw);
    } catch {
      data = { servers: {} };
    }

    // بررسی اینکه این سرور قبلاً کشور ساخته یا نه
    if (data.servers[serverId]) {
      return await interaction.editReply({ content: '❌ این سرور قبلاً یک کشور ساخته.' });
    }

    // بررسی اینکه اسم کشور تکراری نباشه
    const isDuplicate = Object.values(data.servers).some(s => s.country === countryName);
    if (isDuplicate) {
      return await interaction.editReply({ content: '❌ کشوری با این نام قبلاً ساخته شده.' });
    }

    // ذخیره کشور
    data.servers[serverId] = {
      country: countryName,
      leader: userId,
      ministers: [],
      customJobs: {
        leader: 'رهبر',
        minister: 'وزیر',
        general: 'ژنرال'
      },
      ideology: ideology,
      currency: currency,
      taxRate: 0.1,
      citizens: [userId],
      armySize: 0,
      factories: 0,
      landArea: 1000
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    await interaction.editReply(`✅ کشور **${countryName}** با ایدئولوژی **${ideology}** و واحد پول **${currency}** ساخته شد!`);

  } catch (err) {
    console.error('❌ خطا در ساخت کشور:', err);
    await interaction.editReply({ content: '❌ خطایی در ساخت کشور رخ داد.' });
  }
}
