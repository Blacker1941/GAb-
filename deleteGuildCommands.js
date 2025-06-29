import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deleteAllCommands() {
  try {
    // حذف کامندهای گیلد
    console.log('🔧 در حال دریافت کامندهای گیلد...');
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    );

    if (guildCommands.length > 0) {
      console.log(`📛 در حال حذف ${guildCommands.length} کامند گیلد...`);
      for (const command of guildCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, command.id)
        );
        console.log(`✅ کامند گیلد '${command.name}' حذف شد.`);
      }
    } else {
      console.log('ℹ️ کامند گیلدی یافت نشد.');
    }

    // حذف کامندهای گلوبال
    console.log('\n🌍 در حال دریافت کامندهای گلوبال...');
    const globalCommands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );

    if (globalCommands.length > 0) {
      console.log(`📛 در حال حذف ${globalCommands.length} کامند گلوبال...`);
      for (const command of globalCommands) {
        await rest.delete(
          Routes.applicationCommand(process.env.CLIENT_ID, command.id)
        );
        console.log(`✅ کامند گلوبال '${command.name}' حذف شد.`);
      }
    } else {
      console.log('ℹ️ کامند گلوبالی یافت نشد.');
    }

    console.log('\n🚮 تمام کامندها (گیلد و گلوبال) حذف شدند.');
  } catch (error) {
    console.error('❌ خطا در حذف کامندها:', error);
  }
}

deleteAllCommands();