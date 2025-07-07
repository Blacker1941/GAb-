import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('deposit')
  .setDescription('واریز سکه به بانک')
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('مقدار واریز')
      .setRequired(true)
  );

export async function execute(interaction, economy, saveEconomy) {
  const userId = interaction.user.id;
  const amount = interaction.options.getInteger('amount');

  // بررسی مقدار ورودی
  if (!amount || amount <= 0) {
    await interaction.reply({ content: "❌ مقدار واریز باید عدد مثبت باشد.", ephemeral: true });
    return;
  }

  // اطمینان از وجود آبجکت اقتصاد کاربر
  if (!economy[userId]) {
    economy[userId] = { wallet: 0, bank: 0, jobCooldown: 0, inventory: [] };
  }

  // بررسی موجودی کیف پول
  if (economy[userId].wallet < amount) {
    await interaction.reply({ content: "❌ موجودی کیف پول شما کافی نیست.", ephemeral: true });
    return;
  }

  // به‌روزرسانی مقادیر
  economy[userId].wallet -= amount;
  economy[userId].bank += amount;

  // ذخیره‌سازی داده‌ها (ممکن است async باشد)
  await saveEconomy();

  // ارسال پاسخ نهایی
  await interaction.reply(`✅ ${amount} <:WorldDollar:1391358868142948453> با موفقیت به بانک واریز شد.`);
}
