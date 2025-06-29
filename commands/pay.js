import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

export const data = new SlashCommandBuilder()
  .setName('pay')
  .setDescription('انتقال پول به کاربر دیگر')
  .addUserOption(option =>
    option.setName('کاربر')
      .setDescription('کاربری که می‌خواهید به او پول بدهید')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('مقدار')
      .setDescription('مقدار پول برای انتقال')
      .setRequired(true));

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const targetUser = interaction.options.getUser('کاربر');
    const amount = interaction.options.getInteger('مقدار');

    if (targetUser.id === senderId) {
      await interaction.editReply({ content: '❌ نمی‌توانید به خودتان پول انتقال دهید.', ephemeral: true });
      return;
    }

    if (targetUser.bot) {
      await interaction.editReply({ content: '❌ نمی‌توانید به بات‌ها پول انتقال دهید.', ephemeral: true });
      return;
    }

    if (amount <= 0) {
      await interaction.editReply({ content: '❌ مقدار انتقال باید عدد مثبت باشد.', ephemeral: true });
      return;
    }

    await ensureUser(senderId);
    await ensureUser(targetUser.id);

    if (!economy[senderId] || !economy[targetUser.id]) {
      await interaction.editReply({ content: '❌ خطا در دریافت اطلاعات حساب کاربری.', ephemeral: true });
      return;
    }

    if (economy[senderId].wallet < amount) {
      await interaction.editReply({ content: '❌ موجودی کیف پول شما کافی نیست.', ephemeral: true });
      return;
    }

    economy[senderId].wallet -= amount;
    economy[targetUser.id].wallet += amount;
    await saveEconomy();

    async function generatePayCheck() {
      const width = 900;
      const height = 450;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // پس‌زمینه کاغذی
      ctx.fillStyle = '#f9f4e7';
      ctx.fillRect(0, 0, width, height);

      // بافت نویز کاغذ
      for (let i = 0; i < 1500; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.015})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }

      // قاب چک
      ctx.strokeStyle = '#6b4f3f';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // عنوان چک با آرم در دو طرف
      ctx.font = 'bold 42px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6b4f3f';

      const titleText = 'چک بانکی گنگ ادمین';
      const textY = 80;
      const textX = width / 2;
      ctx.fillText(titleText, textX, textY);

      // بارگذاری نماد حکومت
      const emblemPath = path.join(process.cwd(), 'img', '1.png');
      const emblemBuffer = fs.readFileSync(emblemPath);
      const emblemImage = await Canvas.loadImage(emblemBuffer);
      const emblemSize = 60;

      const cropSize = Math.min(emblemImage.width, emblemImage.height);
      const cropX = (emblemImage.width - cropSize) / 2;
      const cropY = (emblemImage.height - cropSize) / 2;

      const spacing = 20;
      const textWidth = ctx.measureText(titleText).width;

      const leftEmblemX = textX - (textWidth / 2) - emblemSize - spacing + 20;
      const emblemY = textY - emblemSize + 15;
      const rightEmblemX = textX + (textWidth / 2) + spacing - 20;

      ctx.drawImage(
        emblemImage,
        cropX, cropY, cropSize, cropSize,
        leftEmblemX, emblemY, emblemSize, emblemSize
      );
      ctx.drawImage(
        emblemImage,
        cropX, cropY, cropSize, cropSize,
        rightEmblemX, emblemY, emblemSize, emblemSize
      );

      // نام پرداخت کننده و دریافت کننده
      ctx.fillStyle = '#5a3e2b';
      ctx.font = '28px Tahoma';
      ctx.textAlign = 'right';
      ctx.fillText(`پرداخت کننده: ${interaction.user.username}#${interaction.user.discriminator}`, width - 50, 200);
      ctx.fillText(`دریافت کننده: ${targetUser.username}#${targetUser.discriminator}`, width - 50, 250);

      // مبلغ
      ctx.fillStyle = '#5a3e2b';
      ctx.font = 'bold 40px Tahoma';
      ctx.textAlign = 'left';
      ctx.fillText('مبلغ:', 50, 320);

      ctx.font = 'bold 50px Tahoma';
      ctx.fillText(`${amount}`, 170, 320);

      // عکس سکه
      const coinPath = path.join(process.cwd(), 'img', 's-l1600.jpg');
      const coinBuffer = fs.readFileSync(coinPath);
      const coinImage = await Canvas.loadImage(coinBuffer);
      const coinWidth = 90;
      const coinHeight = 55;
      const amountTextWidth = ctx.measureText(`${amount}`).width;
      const coinX = 170 + amountTextWidth + 20;
      const coinY = 320 - coinHeight + 10;
      ctx.drawImage(coinImage, coinX, coinY, coinWidth, coinHeight);

      // تاریخ
      const date = new Date();
      ctx.fillStyle = '#5a3e2b';
      ctx.font = '24px Tahoma';
      ctx.textAlign = 'left';
      ctx.fillText(`تاریخ: ${date.toLocaleDateString()}`, 50, height - 50);

      // خط امضا
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 300, height - 80);
      ctx.lineTo(width - 50, height - 80);
      ctx.stroke();

      ctx.font = 'italic 22px Tahoma';
      ctx.fillText('مهر', width - 100, height - 90);

      // مهر
      const stampPath = path.join(process.cwd(), 'img', '13.png');
      const stampBuffer = fs.readFileSync(stampPath);
      const stampImage = await Canvas.loadImage(stampBuffer);
      const stampWidth = 80;
      const stampHeight = 80;
      const stampX = width - 190;
      const stampY = height - 130;
      ctx.drawImage(stampImage, stampX, stampY, stampWidth, stampHeight);

      // آواتار پرداخت کننده
      const senderAvatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
      const senderResponse = await fetch(senderAvatarUrl);
      const senderBuffer = Buffer.from(await senderResponse.arrayBuffer());
      const senderAvatar = await Canvas.loadImage(senderBuffer);

      ctx.save();
      ctx.beginPath();
      ctx.arc(110, 100, 60, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(senderAvatar, 50, 40, 120, 120);
      ctx.restore();

      // آواتار دریافت کننده
      const targetAvatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
      const targetResponse = await fetch(targetAvatarUrl);
      const targetBuffer = Buffer.from(await targetResponse.arrayBuffer());
      const targetAvatar = await Canvas.loadImage(targetBuffer);

      ctx.save();
      ctx.beginPath();
      ctx.arc(width - 110, 100, 60, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(targetAvatar, width - 170, 40, 120, 120);
      ctx.restore();

      return canvas.toBuffer();
    }

    const buffer = await generatePayCheck();
    const attachment = new AttachmentBuilder(buffer, { name: 'paycheck.png' });

    await interaction.editReply({
      content: `✅ انتقال ${amount} <:lenin:1383454156840370236> انجام شد از ${interaction.user} به ${targetUser}.`,
      files: [attachment]
    });
  } catch (error) {
    console.error('Error in /pay command:', error);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: '❌ خطایی رخ داد، لطفا دوباره تلاش کنید.', ephemeral: true });
    } else {
      await interaction.editReply({ content: '❌ خطایی رخ داد، لطفا دوباره تلاش کنید.' });
    }
  }
}
