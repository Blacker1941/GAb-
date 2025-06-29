import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import Canvas from 'canvas';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fitTextToWidth(ctx, text, maxWidth, initialFontSize, minFontSize, fontFamily = 'Arial', fontWeight = '') {
  let fontSize = initialFontSize;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  let textWidth = ctx.measureText(text).width;

  while (textWidth > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    textWidth = ctx.measureText(text).width;
  }
  return fontSize;
}

export const data = new SlashCommandBuilder()
  .setName('jobinfo')
  .setDescription('نمایش اطلاعات شغلی کاربر')
  .addUserOption(option =>
    option.setName('user').setDescription('کاربر موردنظر').setRequired(false)
  );

export async function execute(interaction, economy) {
  let isDeferred = false;

  try {
    await interaction.deferReply();
    isDeferred = true;

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;
    const userData = economy[userId];

    if (!userData || !userData.jobBranch || userData.branchLevel === 0) {
      await interaction.editReply({ content: `❌ ${targetUser.username} هنوز شاخه شغلی انتخاب نکرده است.`, flags: 64 });
      return;
    }

    // بارگذاری اطلاعات کشورها
    let countriesData = {};
    try {
      const dataRaw = await fs.readFile(path.join(__dirname, '..', 'countriesData.json'), 'utf8');
      countriesData = JSON.parse(dataRaw);
    } catch (err) {
      console.error('خطا در خواندن countriesData.json:', err);
    }

    // پرچم کشور
    let flagURL = null;
    if (countriesData.servers) {
      for (const serverId in countriesData.servers) {
        const server = countriesData.servers[serverId];
        if (server.citizens.includes(userId)) {
          flagURL = server.flagImage || null;
          break;
        }
      }
    }
    if (!flagURL) flagURL = path.join(__dirname, '..', 'img', 'flag.png');

    // بارگذاری لیست شغل داینامیک
    let jobList;
    try {
      const jobModule = await import(`file://${path.join(__dirname, '..', 'data', 'jobs', `${userData.jobBranch}.js`)}`);
      jobList = jobModule.jobList;
    } catch (err) {
      console.error("خطا در بارگذاری ماژول شغلی:", err);
      await interaction.editReply({ content: "❌ شغل‌های این شاخه پیدا نشدند.", flags: 64 });
      return;
    }

    const currentLevel = userData.branchLevel;
    const customJob = userData.customJob || null;
    const currentJob = customJob ? { name: customJob } : jobList[currentLevel - 1] || { name: "نامشخص" };
    const previousJob = customJob ? null : (jobList[currentLevel - 2] || null);
    const maxLevel = jobList.length;
    const isAtMaxLevel = currentLevel >= maxLevel;
    const nextJob = !isAtMaxLevel ? jobList[currentLevel] : null;
    const nextUpgradeCost = nextJob ? Math.floor(nextJob.max * 15) : null;

    const width = 900, height = 500;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f2027');
    gradient.addColorStop(0.5, '#203a43');
    gradient.addColorStop(1, '#2c5364');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    roundRect(ctx, 20, 20, width - 40, height - 40, 25, true, true);

    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarResponse = await fetch(avatarURL);
    const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
    const avatar = await Canvas.loadImage(avatarBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 90, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 60, 60, 180, 180);
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(targetUser.username, 320, 100);

    try {
      let flagImage;
      if (flagURL.startsWith('http')) {
        const response = await fetch(flagURL);
        const buffer = Buffer.from(await response.arrayBuffer());
        flagImage = await Canvas.loadImage(buffer);
      } else {
        flagImage = await Canvas.loadImage(flagURL);
      }
      ctx.drawImage(flagImage, 270, 75, 40, 26);
    } catch (e) {
      console.error("خطا در بارگذاری پرچم:", e);
    }

    ctx.fillStyle = '#cccccc';
    ctx.font = '24px Arial';
    ctx.fillText(`کد کاربری: ${userId}`, 270, 145);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`شاخه شغلی: ${userData.jobBranch}`, 270, 190);

    const jobName = `لول فعلی: ${currentJob.name} (لول ${currentLevel})`;
    const fontSize = fitTextToWidth(ctx, jobName, 500, 28, 14, 'Arial', 'bold');
    ctx.fillStyle = '#00FFFF';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText(jobName, 270, 240);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '24px Arial';
    ctx.fillText(`لول قبلی: ${customJob ? customJob : previousJob ? previousJob.name : 'ندارد'}`, 270, 280);
    ctx.fillText(`لول بعدی: ${customJob ? customJob : nextJob ? nextJob.name : 'حداکثر سطح'}`, 270, 320);

    const moneyIconPath = path.join(__dirname, '..', 'img', 's-l1600.jpg');
    try {
      const moneyIcon = await Canvas.loadImage(moneyIconPath);
      if (!isAtMaxLevel && nextUpgradeCost) {
        ctx.drawImage(moneyIcon, 270, 340, 60, 40);
        ctx.fillStyle = '#FF6347';
        ctx.font = 'bold 26px Arial';
        ctx.fillText(` هزینه ارتقاء :  ${nextUpgradeCost}`, 340, 370);
      } else {
        ctx.fillStyle = '#FF6347';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('حداکثر سطح', 270, 370);
      }
    } catch (e) {
      console.error("خطا در بارگذاری آیکون پول:", e);
    }

    try {
      const stampImage = await Canvas.loadImage(path.join(__dirname, '..', 'img', 'stamp.png'));
      ctx.globalAlpha = 0.07;
      ctx.drawImage(stampImage, width - 250, height - 250, 220, 220);
      ctx.globalAlpha = 1;
    } catch (e) {}

    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'job_card.png' });
    await interaction.editReply({ files: [attachment] });

  } catch (error) {
    console.error('Error in jobinfo command:', error);
    try {
      if (isDeferred) {
        await interaction.editReply({ content: 'مشکلی در اجرای کامند رخ داد!' });
      } else {
        await interaction.reply({ content: 'مشکلی در اجرای کامند رخ داد!', flags: 64 });
      }
    } catch (innerError) {
      console.error("Failed to send error message:", innerError);
    }
  }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === 'number') {
    r = { tl: r, tr: r, br: r, bl: r };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (const side in defaultRadius) {
      r[side] = r[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

