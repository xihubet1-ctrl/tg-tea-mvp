import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBAPP_URL = process.env.WEBAPP_URL!;
export const bot = new Telegraf(BOT_TOKEN);

export async function setupBot() {
  await bot.telegram.setChatMenuButton({
    menu_button: { type: 'web_app', text: '🧋 点奶茶下单', web_app: { url: WEBAPP_URL } }
  });

  bot.start((ctx) => {
    return ctx.reply('欢迎来到 瑞幸·七号家园店（仅七号家园内配送）', Markup.keyboard([
      [Markup.button.webApp('🧋 点奶茶', WEBAPP_URL)]
    ]).resize());
  });

  bot.action(/^order:(confirm|cancel):(.+)$/, async (ctx) => {
    const [, action] = ctx.match as any;
    await ctx.answerCbQuery(action === 'confirm' ? '已确认' : '已取消');
  });

  bot.launch();
}
