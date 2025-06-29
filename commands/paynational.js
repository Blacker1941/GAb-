import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('paynational')
  .setDescription('انتقال پول واحد پول ملی کشور به کاربر دیگر')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('کاربری که می‌خواهید به او پول ملی کشور را انتقال دهید')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('amount')
      .setDescription('مقدار پول برای انتقال')
      .setRequired(true));

async function loadCountryData() {
  const filePath = path.join(process.cwd(), 'countriesData.json');
  const jsonString = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(jsonString);
}

export async function execute(interaction, economy, saveEconomy, ensureUser) {
  try {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (targetUser.id === senderId) {
      return await interaction.editReply({ content: '❌ نمی‌توانید به خودتان پول انتقال دهید.', ephemeral: true });
    }
    if (targetUser.bot) {
      return await interaction.editReply({ content: '❌ نمی‌توانید به بات‌ها پول انتقال دهید.', ephemeral: true });
    }
    if (amount <= 0) {
      return await interaction.editReply({ content: '❌ مقدار انتقال باید عدد مثبت باشد.', ephemeral: true });
    }

    await ensureUser(senderId);
    await ensureUser(targetUser.id);

    if (!economy[senderId] || !economy[targetUser.id]) {
      return await interaction.editReply({ content: '❌ خطا در دریافت اطلاعات حساب کاربری.', ephemeral: true });
    }

    // بارگذاری اطلاعات کشورها
    const countryData = await loadCountryData();

    // پیدا کردن کشور ارسال‌کننده
    let senderServerId = null;
    for (const id in countryData.servers) {
      if (countryData.servers[id].citizens.includes(senderId)) {
        senderServerId = id;
        break;
      }
    }

    // پیدا کردن کشور گیرنده
    let targetServerId = null;
    for (const id in countryData.servers) {
      if (countryData.servers[id].citizens.includes(targetUser.id)) {
        targetServerId = id;
        break;
      }
    }

    if (!senderServerId) {
      return await interaction.editReply({ content: '❌ شما عضو هیچ کشوری نیستید.', ephemeral: true });
    }

    if (!targetServerId) {
      return await interaction.editReply({ content: '❌ کاربر هدف عضو هیچ کشوری نیست.', ephemeral: true });
    }

    if (senderServerId !== targetServerId) {
      return await interaction.editReply({ content: '❌ انتقال فقط بین اعضای یک کشور مجاز است.', ephemeral: true });
    }

    const senderServer = countryData.servers[senderServerId];
    const senderWalletKey = 'wallet' + senderServerId;

    if (!economy[senderId][senderWalletKey] || economy[senderId][senderWalletKey] < amount) {
      return await interaction.editReply({ content: `❌ موجودی کافی ${senderServer.currency || 'پول ملی'} ندارید.`, ephemeral: true });
    }

    if (!economy[targetUser.id][senderWalletKey]) {
      economy[targetUser.id][senderWalletKey] = 0;
    }

    economy[senderId][senderWalletKey] -= amount;
    economy[targetUser.id][senderWalletKey] += amount;

    await saveEconomy();

    // تولید تصویر چک با نماد و واحد پول کشور
    async function generatePayCheck() {
      const width = 900;
      const height = 450;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // پس‌زمینه کاغذی
      ctx.fillStyle = '#f9f4e7';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 1500; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.015})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }

      ctx.strokeStyle = '#6b4f3f';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      const countryName = senderServer.country || 'نامشخص';
      const titleText = `چک بانکی ${countryName}`;
      const textY = 80;
      const textX = width / 2;
      ctx.font = 'bold 42px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6b4f3f';
      ctx.fillText(titleText, textX, textY);

      const emblemSize = 60;
      const spacing = 20;
      const emblemUrl = senderServer.symbolImage || null;
      const textWidth = ctx.measureText(titleText).width;
      const emblemY = textY - emblemSize + 15;
      const leftEmblemX = textX - (textWidth / 2) - emblemSize - spacing + 20;
      const rightEmblemX = textX + (textWidth / 2) + spacing - 20;

      async function drawEmblem(x, y) {
        try {
          if (!emblemUrl) throw new Error('نماد کشور موجود نیست');
          const res = await fetch(emblemUrl);
          const buf = Buffer.from(await res.arrayBuffer());
          const img = await Canvas.loadImage(buf);
          ctx.drawImage(img, x, y, emblemSize, emblemSize);
        } catch {
          ctx.font = '40px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🏛️', x + emblemSize / 2, y + emblemSize - 10);
        }
      }

      await drawEmblem(leftEmblemX, emblemY);
      await drawEmblem(rightEmblemX, emblemY);

      ctx.fillStyle = '#5a3e2b';
      ctx.font = '28px Tahoma';
      ctx.textAlign = 'right';
      ctx.fillText(`پرداخت کننده: ${interaction.user.username}#${interaction.user.discriminator}`, width - 50, 180);
      ctx.fillText(`دریافت کننده: ${targetUser.username}#${targetUser.discriminator}`, width - 50, 230);

      ctx.fillStyle = '#5a3e2b';
      ctx.font = 'bold 48px Tahoma';
      ctx.textAlign = 'left';
      ctx.fillText('مبلغ:', 50, 320);

      ctx.font = 'bold 56px Tahoma';
      const amountText = `${amount}`;
      ctx.fillText(amountText, 180, 320);

      const rectWidth = 70;
      const rectHeight = 40;

      try {
        const curRes = await fetch(senderServer.currencyImage);
        const curBuf = Buffer.from(await curRes.arrayBuffer());
        const curImg = await Canvas.loadImage(curBuf);
        const textWidth = ctx.measureText(amountText).width;
        ctx.drawImage(curImg, 190 + textWidth + 10, 320 - rectHeight, rectWidth, rectHeight);
      } catch {
        ctx.font = '36px serif';
        ctx.fillText('💰', 190 + ctx.measureText(amountText).width + 20, 320);
      }

      const date = new Date();
      ctx.font = '24px Tahoma';
      ctx.fillText(`تاریخ: ${date.toLocaleDateString()}`, 50, height - 50);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 300, height - 80);
      ctx.lineTo(width - 50, height - 80);
      ctx.stroke();

      ctx.font = 'italic 22px Tahoma';
      ctx.fillText('مهر', width - 100, height - 90);


      const stampPath = path.join(process.cwd(), 'img', '13.png');
      const stampBuffer = await fs.readFile(stampPath);
      const stampImage = await Canvas.loadImage(stampBuffer);
      ctx.drawImage(stampImage, width - 190, height - 130, 80, 80);
      
      
      try {
        const senderAvatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
        const senderBuf = Buffer.from(await (await fetch(senderAvatarUrl)).arrayBuffer());
        const senderAvatar = await Canvas.loadImage(senderBuf);
        ctx.save();
        ctx.beginPath();
        ctx.arc(110, 95, 60, 0, Math.PI * 2); 
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(senderAvatar, 50, 38, 120, 120); // Y از 40 به 38 تغییر کرد
        ctx.restore();
      } catch {}
      
      
      try {
        const targetAvatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const targetBuf = Buffer.from(await (await fetch(targetAvatarUrl)).arrayBuffer());
        const targetAvatar = await Canvas.loadImage(targetBuf);
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 110, 95, 60, 0, Math.PI * 2); 
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(targetAvatar, width - 170, 38, 120, 120); // Y از 40 به 38 تغییر کرد
        ctx.restore();
      } catch {}
      

      return canvas.toBuffer();
    }

    const buffer = await generatePayCheck();
    const attachment = new AttachmentBuilder(buffer, { name: 'paynational.png' });

    await interaction.editReply({
      content: `✅ انتقال موفقیت‌آمیز ${amount} ${senderServer.currency || 'پول ملی'} از ${interaction.user} به ${targetUser} انجام شد.`,
      files: [attachment]
    });

  } catch (error) {
    console.error('خطا در کامند /paynational:', error);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: '❌ خطایی رخ داد، لطفا دوباره تلاش کنید.', ephemeral: true });
    } else {
      await interaction.editReply({ content: '❌ خطایی رخ داد، لطفا دوباره تلاش کنید.' });
    }
  }
}
