import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function listCommands() {
  try {
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    );
    console.log("Guild Commands:", guildCommands);

    const globalCommands = await rest.get(
      Routes.applicationCommands(process.env.CLIENT_ID)
    );
    console.log("Global Commands:", globalCommands);
  } catch (error) {
    console.error(error);
  }
}

listCommands();
