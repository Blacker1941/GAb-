import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('withdraw')
  .setDescription('برداشت پول از بانک')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('مقدار پولی که می‌خواهید برداشت کنید')
      .setRequired(true)
  );

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('amount');

    await ensureUser(userId);

    if (amount <= 0) {
      await interaction.reply({ content: '❌ مقدار برداشت باید عدد مثبت باشد.', ephemeral: true });
      return;
    }

    if (economy[userId].bank < amount) {
      await interaction.reply({ content: '❌ موجودی بانک شما کافی نیست.', ephemeral: true });
      return;
    }

    economy[userId].bank -= amount;
    economy[userId].wallet += amount;

    await saveEconomy();

    await interaction.reply({ content: `✅ مبلغ ${amount} <:WorldDollar:1391358868142948453> با موفقیت از بانک برداشت شد.`, ephemeral: true });
  } catch (error) {
    console.error('Error in withdraw command:', error);
    await interaction.reply({ content: '❌ خطایی در پردازش درخواست شما رخ داده است.', ephemeral: true });
  }
}
