import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('joincountry')
  .setDescription('شهروند یک کشور شوید')
  .addStringOption(option =>
    option
      .setName('country')
      .setDescription('نام کشور یا آیدی کشور')
      .setRequired(true)
  );

export async function execute(interaction) {
  const userId = interaction.user.id;
  const countryInput = interaction.options.getString('country').trim();

  // خواندن فایل countriesData.json
  const countriesPath = path.join(__dirname, '..', 'countriesData.json');
  let countriesData;

  try {
    const rawData = await fs.readFile(countriesPath, 'utf8');
    countriesData = JSON.parse(rawData);
  } catch (err) {
    console.error('خطا در خواندن countriesData.json:', err);
    return interaction.reply({ content: '❌ خطا در بارگذاری داده‌های کشورها.', ephemeral: true });
  }

  // بررسی اینکه آیا کاربر قبلاً عضو هر کشوری هست یا نه
  let alreadyMemberOf = null;
  for (const serverId in countriesData.servers) {
    const server = countriesData.servers[serverId];
    if (server.citizens.includes(userId)) {
      alreadyMemberOf = server.country;
      break;
    }
  }
  if (alreadyMemberOf) {
    return interaction.reply({ content: `⚠️ شما قبلاً عضو کشور **${alreadyMemberOf}** هستید و نمی‌توانید عضو کشور دیگری شوید.`, ephemeral: true });
  }

  // جستجوی کشور بر اساس نام یا آیدی
  let foundServerId = null;
  for (const serverId in countriesData.servers) {
    const server = countriesData.servers[serverId];
    if (server.country.toLowerCase() === countryInput.toLowerCase() || serverId === countryInput) {
      foundServerId = serverId;
      break;
    }
  }

  if (!foundServerId) {
    return interaction.reply({ content: '❌ کشور مورد نظر پیدا نشد. لطفاً نام یا آیدی صحیح وارد کنید.', ephemeral: true });
  }

  // اضافه کردن کاربر به شهروندان کشور
  countriesData.servers[foundServerId].citizens.push(userId);

  // ذخیره تغییرات
  try {
    await fs.writeFile(countriesPath, JSON.stringify(countriesData, null, 2), 'utf8');
  } catch (err) {
    console.error('خطا در ذخیره countriesData.json:', err);
    return interaction.reply({ content: '❌ خطا در ذخیره‌سازی داده‌ها. لطفاً بعداً تلاش کنید.', ephemeral: true });
  }

  return interaction.reply({ content: `✅ شما با موفقیت به شهروندان کشور **${countriesData.servers[foundServerId].country}** اضافه شدید.` });
}
