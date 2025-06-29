import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('leavecountry')
  .setDescription('ترک کشور فعلی‌تان');

export async function execute(interaction) {
  const userId = interaction.user.id;

  const countriesPath = path.join(__dirname, '..', 'countriesData.json');
  let countriesData;

  try {
    const rawData = await fs.readFile(countriesPath, 'utf8');
    countriesData = JSON.parse(rawData);
  } catch (err) {
    console.error('خطا در خواندن countriesData.json:', err);
    return interaction.reply({ content: '❌ خطا در بارگذاری داده‌های کشورها.', ephemeral: true });
  }

  let foundServerId = null;

  for (const serverId in countriesData.servers) {
    const server = countriesData.servers[serverId];
    if (server.citizens.includes(userId)) {
      foundServerId = serverId;
      break;
    }
  }

  if (!foundServerId) {
    return interaction.reply({ content: '⚠️ شما در هیچ کشوری عضو نیستید.', ephemeral: true });
  }

  // حذف کاربر از لیست شهروندان کشور
  countriesData.servers[foundServerId].citizens = countriesData.servers[foundServerId].citizens.filter(id => id !== userId);

  try {
    await fs.writeFile(countriesPath, JSON.stringify(countriesData, null, 2), 'utf8');
  } catch (err) {
    console.error('خطا در ذخیره countriesData.json:', err);
    return interaction.reply({ content: '❌ خطا در ذخیره‌سازی داده‌ها. لطفاً بعداً تلاش کنید.', ephemeral: true });
  }

  return interaction.reply({ content: `✅ شما با موفقیت کشور **${countriesData.servers[foundServerId].country}** را ترک کردید.` });
}
