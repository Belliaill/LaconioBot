import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import LocalSession from "telegraf-session-local";

dotenv.config();

const Command = {
  Ban: "/ban",
  UnBan: "/unban",
};

const BotState = {
  Chat: "chat",
  GetDonate: "get-donate",
  SendNick: "send-nick",
  SendScreen: "send-screen",
  VideoSent: "video-sent",
  StickerSent: "sticker-sent",
  None: "",
};

const adminChatId = process.env.ADMIN_CHAT_ID;
const donateChatId = process.env.DONATE_CHAT_ID;

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(
  new LocalSession({
    database: "sessions.json",
  })
);

//start

bot.start((ctx) => {
  ctx.session.state = BotState.None;
  ctx.reply(
    `Приветствую, ${ctx.from.first_name}. Здесь ты можешь написать админам или купить донат.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Предложка", callback_data: "msg" },
            { text: "Донат", callback_data: "donate" },
          ],
        ],
      },
    }
  );
});

bot.on("message", async (ctx) => {
  if (ctx.chat.id == adminChatId || ctx.chat.id == donateChatId) {
    if (!ctx.message.text && ctx.message.text.startsWith(Command.UnBan)) {
      const parts = ctx.message.text.split(" ");
      parts.splice(0, 1);
      const id = parts.join(" ");
      if (user) {
        await ctx.unbanChatMember(id);
        await ctx.reply(
          `Пользователь с ником "${user.name}" раззабанен по айди ${user.id}!`
        );
      } else {
        await ctx.reply(
          `Пользователя с ником "${user.name}" не существует в нашей базе!`
        );
      }
      return;
    }
    if (ctx.message.reply_to_message) {
      const id = ctx.message.reply_to_message.text.split("\n")[0];

      console.log("!Message!", ctx.message);
      console.log("!Iportant!", ctx.message.reply_to_message);

      if (!ctx.message.text && ctx.message.text == Command.Ban) {
        await ctx.banChatMember(id);
        await ctx.reply(
          `Пользователь с ником "${user.name}" забанен по айди ${user.id}!`
        );
      } else {
        await bot.telegram.sendMessage(id, `Ответ:\n${ctx.message.text}`);
      }
    }
    return;
  }
  switch (ctx.session.state) {
    case BotState.Chat:
      await bot.telegram.sendMessage(
        adminChatId,
        `${ctx.from.id}\nОт ${ctx.from.first_name}\n${ctx.message.text}`
      );
      await ctx.reply("Ваше сообщение было доставлено админам", {
        reply_markup: {
          inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
        },
      });
      break;
    case BotState.GetDonate:
      let lcoin = ctx.message.text;
      if (ctx.message.text > 1000) {
        await ctx.reply(
          `Введите количество(числoм) лакоинов до 1000 включительно.`
        );
        return;
      }

      let counter = 0;
      let dis = 1.02;
      while (counter < lcoin) {
        counter += 100;
        dis -= 0.02;
      }
      let lcdis = Math.round(lcoin * dis);

      if (isNaN(lcdis)) {
        await ctx.reply("Введите число лакоинов до 1000 включительно", {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        });
        return;
      } else {
        await ctx.reply(
          "Вы хотите купить " +
            lcoin +
            " лакоинов. Пожалуйста, отправьте " +
            lcdis +
            " гривен на карту 5375411418333733 . После этого отправьте сюда скрин с переводом и подпишите своим ником на сервере.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
            },
          }
        );
      }
      ctx.session.lcoinCount = lcdis;
      await ctx.reply("Введите ник");
      ctx.session.state = BotState.SendNick;
      break;
    case BotState.SendNick:
      if (!ctx.message.text) {
        await ctx.reply("Попрубуйте ещё раз");
        return;
      }
      ctx.session.nick = ctx.message.text;
      // await ctx.forwardMessage(donateChatId);
      await ctx.reply("Ваш ник " + ctx.message.text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Подтвердить", callback_data: "acceptnick" },
              { text: "Назад", callback_data: "back" },
            ],
          ],
        },
      });
      ctx.session.state = BotState.SendScreen;
      break;
    case BotState.SendScreen:
      // ctx.reply("Скиньте скнрин перевода денег");
      if (
        !ctx.message.photo &&
        ctx.chat.id != adminChatId &&
        ctx.chat.id != donateChatId
      ) {
        await ctx.reply("Попрубуйте ещё раз");
        return;
      }
      // ctx.session.nick = ctx.message.photo;
      await ctx.forwardMessage(donateChatId);
      const nick = ctx.session.nick;
      const count = ctx.session.lcoinCount;
      // ctx.reply();
      await bot.telegram.sendMessage(
        donateChatId,
        "Пользователь " + nick + " задонатил на " + count + " лакоинов"
      );
      ctx.session.state = BotState.None;
      await ctx.reply(
        `Приветствую, ${ctx.from.first_name}. Здесь ты можешь написать админам или купить донат.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Предложка", callback_data: "msg" },
                { text: "Донат", callback_data: "donate" },
              ],
            ],
          },
        }
      );
      break;
    case BotState.VideoSent:
      if (
        ctx.message.video &&
        ctx.chat.id != adminChatId &&
        ctx.chat.id != donateChatId
      ) {
        ctx.reply("К сожалению, я не могу ничего делать с видео");
      }

    case BotState.StickerSent:
      if (
        ctx.message.sticker &&
        ctx.chat.id != adminChatId &&
        ctx.chat.id != donateChatId
      ) {
        ctx.reply("К сожалению, я не могу ничего делать со стикером");
      }

    case BotState.None:
      ctx.reply("Выбирете действия");
      break;
  }
});

bot.action("msg", async (ctx) => {
  ctx.session.state = BotState.Chat;
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "Следующее ваше сообщение будет переслано в предложку.",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
      },
    }
  );
});

//backaction
bot.action("back", async (ctx) => {
  ctx.session.state = BotState.None;
  await ctx.answerCbQuery();
  await ctx.reply(
    `Приветствую, ${ctx.from.first_name}. Здесь ты можешь написать админам или купить донат.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Предложка", callback_data: "msg" },
            { text: "Донат", callback_data: "donate" },
          ],
        ],
      },
    }
  );
});

//donate
bot.action("donate", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText("Выбрать одну из функций:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Купить лакоины", callback_data: "lcoin" }],
        // [{ text: "Купить иконку на дин.карте", callback_data: "icon" }],
      ],
    },
  });
});

//lcoin
bot.action("lcoin", async (ctx) => {
  ctx.session.state = BotState.GetDonate;
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "Введите количество лакоинов которое хотите купить(в числах).",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
      },
    }
  );
});

bot.action("acceptnick", async (ctx) => {
  ctx.session.state = BotState.SendScreen;
  await ctx.answerCbQuery();
  ctx.reply("Скиньте скнрин перевода денег");
});

bot.launch();
