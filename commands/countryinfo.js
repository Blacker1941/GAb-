import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('countryinfo')
  .setDescription('نمایش اطلاعات کشور شما یا جستجو بر اساس نام یا آیدی')
  .addStringOption(option =>
    option
      .setName('search')
      .setDescription('نام کشور یا آیدی سرور را وارد کنید (اختیاری)')
      .setRequired(false)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const searchQuery = interaction.options.getString('search');
  const countriesPath = path.join(__dirname, '..', 'countriesData.json');
  let countriesData;

  try {
    const rawData = await fs.readFile(countriesPath, 'utf8');
    countriesData = JSON.parse(rawData);
  } catch (err) {
    console.error('خطا در خواندن countriesData.json:', err);
    return interaction.reply({ content: '❌ خطا در بارگذاری داده‌های کشورها.', ephemeral: true });
  }

  // پیدا کردن کشور
  let userCountry = null;
  let serverId = null;

  if (searchQuery) {
    for (const id in countriesData.servers) {
      const server = countriesData.servers[id];
      if (
        id === searchQuery ||
        (server.country && server.country.toLowerCase().includes(searchQuery.toLowerCase()))
      ) {
        userCountry = server;
        serverId = id;
        break;
      }
    }

    if (!userCountry) {
      return interaction.reply({ content: '❌ هیچ کشوری با این نام یا آیدی پیدا نشد.', ephemeral: true });
    }
  } else {
    for (const id in countriesData.servers) {
      if (countriesData.servers[id].citizens.includes(userId)) {
        userCountry = countriesData.servers[id];
        serverId = id;
        break;
      }
    }

    if (!userCountry) {
      return interaction.reply({ content: '⚠️ شما در هیچ کشوری عضو نیستید.', ephemeral: true });
    }
  }

  // ساخت امبد اطلاعات
  const embed = new EmbedBuilder()
    .setTitle(`اطلاعات کشور ${userCountry.country}`)
    .setColor('#3498db');

  if (userCountry.flagImage) {
    embed.setThumbnail(userCountry.flagImage);
  }

  embed.addFields([
    { name: 'رهبر', value: `<@${userCountry.leader}>`, inline: true },
    { name: 'ایدئولوژی', value: userCountry.ideology || 'نامشخص', inline: true },
    { name: 'مالیات', value: `${(userCountry.taxRate || 0) * 100}%`, inline: true },
    { name: 'تعداد شهروندان', value: `${userCountry.citizens.length}`, inline: true },
    { name: 'اندازه ارتش', value: `${userCountry.armySize}`, inline: true },
    { name: 'تعداد کارخانه‌ها', value: `${userCountry.factories}`, inline: true },
    { name: 'مساحت کشور', value: `${userCountry.landArea} کیلومتر مربع`, inline: true },
    { name: 'شغل‌های سفارشی', value: Object.entries(userCountry.customJobs || {}).length > 0
      ? Object.entries(userCountry.customJobs).map(([key, val]) => `${key}: ${val}`).join('\n')
      : 'ندارد' },
    { name: 'نماد کشور', value: userCountry.symbolImage ? `[لینک تصویر](${userCountry.symbolImage})` : 'ندارد', inline: true },
    { name: 'واحد پول', value: userCountry.currency || 'ندارد', inline: true },
    { name: 'نماد پول', value: userCountry.currencyImage ? `[لینک تصویر](${userCountry.currencyImage})` : 'ندارد', inline: true }
  ]);

  embed.setFooter({ text: `شناسه کشور: ${serverId}` });

  await interaction.reply({ embeds: [embed] });
}
