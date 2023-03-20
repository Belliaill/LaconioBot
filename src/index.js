import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { DB } from "./db.js";
import LocalSession from "telegraf-session-local";

dotenv.config();

const Command = {
  Ban: "/ban"
}

const BotState = {
  Chatting: "chatting",
  GettingDonate: "getting-donate",
  AcceptingDonate: "accepting-donate",
  SendingNick: "sendnick",
  None: "",
};

const adminChatId = process.env.ADMIN_CHAT_ID;

const donateChatId = "-1001660130168";
//process.env.DONATE_CHAT_ID;

const init = {
  users: [],
  banned: [],
};
const db = new DB("database.json", init);

console.log(process.env.BOT_TOKEN);

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(
  new LocalSession({
    database: "sessions.json",
  })
);

//start

bot.start((ctx) => {
  ctx.session.state = BotState.None;
  const banned = db
    .get((state) => state.banned)
    .find((id) => ctx.from.id == id);
  if (banned) {
    ctx.reply("Вы забанены!");
    return;
  }
  if (!db.get((state) => state.users).some((user) => user.id == ctx.chat.id)) {
    db.append((state) => state.users, {
      id: ctx.from.id,
      chatId: ctx.chat.id,
      name: ctx.from.first_name,
    });
  }
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

bot.on("message", (ctx) => {
  if (ctx.chat.id == adminChatId) {
    if (ctx.message.reply_to_message) {
      const users = db.get((state) => state.users);
      const name = ctx.message.reply_to_message.forward_sender_name
        ? ctx.message.reply_to_message.forward_sender_name
        : ctx.message.reply_to_message.forward_from.first_name;
      const user = users.find((u) => {
        return u.name == name;
      });
      if (ctx.message.text == Command.Ban) {
        if (user) {
          db.append((state) => state.banned, user.id);
          ctx.reply(
            `Пользователь с ником "${user.name}" забанен по айди ${user.id}!`
          );
        } else {
          ctx.reply(
            `Пользователя с ником "${user.name}" не существует в нашей базе!`
          );
        }
      } else {
        bot.telegram.sendMessage(user.chatId, ctx.message.text);
      }
      // console.log("!Iportant!", ctx.message.reply_to_message);
      // console.log("Other", ctx.chat.id, users, user);
    }
    return;
  }
  switch (ctx.session.state) {
    case BotState.Chatting:
      ctx.forwardMessage(adminChatId);
      break;
    case BotState.GettingDonate:
      let lcoin = ctx.message.text;
      if (ctx.message.text > 1000) {
        ctx.reply(`Введите количество(числoм) лакоинов до 1000 включительно.`);
      } else {
        let counter = 0;
        let dis = 1.02;
        while (counter < lcoin) {
          counter += 100;
          dis -= 0.02;
        }
        let lcdis = Math.round(lcoin * dis);
        console.log(lcdis);
        if (isNaN(lcdis)) {
          ctx.reply("Введите число лакоинов до 1000 включительно", {
            reply_markup: {
              inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
            },
          });
        } else {
          ctx.reply(
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
      }
      ctx.session.state = BotState.None;
      break;
    // case BotState.SendingNick:
    //   ctx.reply("Ваш ник " + ctx.message.text);
    default:
  }
});


bot.command("ban", (ctx) => {
  if (ctx.chat.id == adminChatId) {

  } else {
    ctx.reply(`У вас нет прав на это действие`);
  }
});

bot.command("unban", (ctx) => {
  if (ctx.chat.id == adminChatId) {
    const name = ctx.message.text.split(" ").slice(0, 1).join(" ");
    console.log(name);
    const user = db.get((state) => state.users).find((u) => u.name == name);
    if (user) {
      db.remove((state) => state.banned, user.id);
      ctx.reply(
        `Пользователь с ником "${user.name}" раззабанен по айди ${user.id}!`
      );
    } else {
      ctx.reply(
        `Пользователя с ником "${user.name}" не существует в нашей базе!`
      );
    }
  } else {
    ctx.reply(`У вас нет прав на это действие`);
  }
});

bot.action("msg", async (ctx) => {
  ctx.session.state = BotState.Chatting;
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
  ctx.session.state = BotState.GettingDonate;
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

bot.on("photo", async (ctx) => {
  if (ctx.chat.id != donateChatId && BotState.GettingDonate) {
    ctx.forwardMessage(donateChatId);

    ctx.reply("Сообщение было отправлено.", {
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
      },
    });
  }
});

bot.launch();
