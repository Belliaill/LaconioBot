import dotenv from "dotenv";
import { Context, Telegraf, Markup } from "telegraf";
import { DB } from "./db.js";
import LocalSession from "telegraf-session-local";

const BotState = {
  Chatting: "chatting",
  GettingDonate: "getting-donate",
  AcceptingDonate: "accepting-donate",
  None: "",
};

const adminChatId = "-1001829016412";
dotenv.config();

const init = {
  users: [],
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
  if (!db.get((state) => state.users).some((user) => user.id == ctx.chat.id)) {
    db.update((state) => ({
      users: [
        ...state.users,
        { id: ctx.from.id, chatId: ctx.chat.id, name: ctx.from.first_name },
      ],
    }));
  }
});

bot.on("message", (ctx) => {
  if (ctx.chat.id == adminChatId && ctx.message.reply_to_message) {
    const users = db.get((state) => state.users);
    const user = users.find((u) => {
      return u.name == ctx.message.reply_to_message.forward_sender_name;
    });
    bot.telegram.sendMessage(user.chatId, ctx.message.text);
    return;
  }
  switch (ctx.session.state) {
    case BotState.Chatting:
      ctx.forwardMessage(adminChatId);
      break;
    case BotState.GettingDonate:
      let lcoin = parseInt(ctx.message.text);
      let counter = 0;
      let dis = 1.02;
      while (counter < lcoin) {
        counter += 100;
        dis -= 0.02;
      }
      ctx.reply(
        "Вы хотите купить " +
          ctx.message.text +
          " лакоинов. Отправьте " +
          Math.floor(lcoin * dis) +
          ' гривен на карту 5375411418333733 и нажмите кнопку "Отослать"',
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Отослать", callback_data: "senddon" }]],
          },
        }
      );
      ctx.session.state = BotState.None;
      break;
    default:
      ctx.reply("Err");
  }
});

bot.action("msg", (ctx) => {
  ctx.session.state = BotState.Chatting;
  ctx.answerCbQuery();
  ctx.reply("Следующее ваше сообщение будет переслано в предложку", {
    reply_markup: {
      inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
    },
  });
});

//backaction
bot.action("back", (ctx) => {
  ctx.session.state = BotState.None;
  ctx.answerCbQuery();
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

//donate
bot.action("donate", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Выбрать одну из функций:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Купить лакоины", callback_data: "lcoin" }],
        [{ text: "Купить иконку на дин.карте", callback_data: "icon" }],
      ],
    },
  });
});

//lcoin
bot.action("lcoin", (ctx) => {
  ctx.session.state = BotState.GettingDonate;
  ctx.answerCbQuery();
  ctx.reply("Введите количество лакоинов которое хотите купить(в числах)");
});

// bot.action("senddon", (ctx) =>{
//   ctx.session.state = BotState.AcceptingDonate

// });

bot.launch();
