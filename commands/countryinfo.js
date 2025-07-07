import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
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

  const embed = new EmbedBuilder().setColor('#3498db');
  let files = [];

  // بررسی اینکه کشور مین هست یا نه
  const isMain = userCountry.isMain === true;

  if (isMain) {
    embed.setTitle('اطلاعات رسمی کشور گنگ ادمین');
  
    const flagPath = path.join(__dirname, '..', 'img', 'flag.png');
    if (await fs.access(flagPath).then(() => true).catch(() => false)) {
      const flagAttachment = new AttachmentBuilder(flagPath, { name: 'flag.png' });
      embed.setThumbnail('attachment://flag.png');
      files.push(flagAttachment);
    }
  
    // تعداد کل اعضای سرور
    const totalMembers = interaction.guild.memberCount;
  
    // تعداد کل شهروندان همه کشورها
    let allCitizens = new Set();
    for (const c of Object.values(countriesData.servers)) {
      if (c.citizens) {
        c.citizens.forEach(cid => allCitizens.add(cid));
      }
    }
  
    // تعداد اعضایی که شهروند هیچ کشوری نیستند (تخمینی)
    const nonCitizensCount = totalMembers - allCitizens.size;
  
    embed.addFields([
      { name: 'رهبر', value: `<@${userCountry.leader}>`, inline: true },
      { name: 'ایدئولوژی', value: userCountry.ideology || 'نامشخص', inline: true },
      { name: 'مالیات', value: `0%`, inline: true },
      { name: 'شهروندان', value: `${nonCitizensCount}`, inline: true },
      { name: 'اندازه ارتش', value: `${userCountry.armySize || 0}`, inline: true },
      { name: 'تعداد کارخانه‌ها', value: `${userCountry.factories || 0}`, inline: true },
      { name: 'مساحت کشور', value: `${userCountry.landArea || 0} کیلومتر مربع`, inline: true },
      { name: 'شغل‌های سفارشی', value: 'ندارد' },
      { name: 'نماد کشور', value: userCountry.symbolImage ? `[لینک تصویر](${userCountry.symbolImage})` : 'لینک ندارد', inline: true },
      { name: 'واحد پول', value: userCountry.currency || 'لنین', inline: true },
      { name: 'نماد پول', value: userCountry.currencyImage ? `[لینک تصویر](${userCountry.currencyImage})` : 'لینک ندارد', inline: true }
    ]);
  
    embed.setFooter({ text: `شناسه کشور: ${serverId}` });
    return await interaction.reply({ embeds: [embed], files });
  } else {
    // حالت کشور عادی
    embed.setTitle(`اطلاعات کشور ${userCountry.country}`);

    if (userCountry.flagImage) {
      embed.setThumbnail(userCountry.flagImage);
    }

    embed.addFields([
      { name: 'رهبر', value: `<@${userCountry.leader}>`, inline: true },
      { name: 'ایدئولوژی', value: userCountry.ideology || 'نامشخص', inline: true },
      { name: 'مالیات', value: `${(userCountry.taxRate || 0) * 100}%`, inline: true },
      { name: 'تعداد شهروندان', value: `${userCountry.citizens.length}`, inline: true },
      { name: 'اندازه ارتش', value: `${userCountry.armySize || 0}`, inline: true },
      { name: 'تعداد کارخانه‌ها', value: `${userCountry.factories || 0}`, inline: true },
      { name: 'مساحت کشور', value: `${userCountry.landArea || 0} کیلومتر مربع`, inline: true },
      {
        name: 'شغل‌های سفارشی',
        value: Object.entries(userCountry.customJobs || {}).length > 0
          ? Object.entries(userCountry.customJobs).map(([key, val]) => `${val.name || key}: <@${val.user || 'نامشخص'}>`).join('\n')
          : 'ندارد'
      },
      { name: 'نماد کشور', value: userCountry.symbolImage ? `[لینک تصویر](${userCountry.symbolImage})` : 'ندارد', inline: true },
      { name: 'واحد پول', value: userCountry.currency || 'ندارد', inline: true },
      { name: 'نماد پول', value: userCountry.currencyImage ? `[لینک تصویر](${userCountry.currencyImage})` : 'ندارد', inline: true }
    ]);

    embed.setFooter({ text: `شناسه کشور: ${serverId}` });

    return await interaction.reply({ embeds: [embed] });
  }
}
