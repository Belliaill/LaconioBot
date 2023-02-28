import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { DB } from "./db.js";
import LocalSession from "telegraf-session-local";

dotenv.config();

const BotState = {
  Chatting: "chatting",
  GettingDonate: "getting-donate",
  AcceptingDonate: "accepting-donate",
  SendingNick: "sendnick",
  None: "",
};

const adminChatId = process.env.ADMIN_CHAT_ID;

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
  console.log(ctx.chat);

  if (ctx.chat.id == adminChatId) {
    if (ctx.message.reply_to_message) {
      const users = db.get((state) => state.users);
      const user = users.find((u) => {
        return u.name == ctx.message.reply_to_message.forward_sender_name;
      });
      console.log(
        ctx.message.reply_to_message,
        ctx.chat.id,
        users,
        user,
        ctx.message.reply_to_message.forward_sender_name
      );
      bot.telegram.sendMessage(user.chatId, ctx.message.text);
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
        ctx.reply(`Введите количество(числoм) лакоинов до 1000 включительно`);
      } else {
        let counter = 0;
        let dis = 1.02;
        while (counter < lcoin) {
          counter += 100;
          dis -= 0.02;
        }
        let lcdis = Math.floor(lcoin * dis);
        ctx.reply(
          "Вы хотите купить " +
            lcoin +
            " лакоинов. Пожалуйста, отправьте " +
            lcdis +
            " гривен на карту. После этого отправьте сюда скрин с переводом и подпишите своим ником на сервере",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
            },
          }
        );
      }
      ctx.session.state = BotState.None;
      break;
    case BotState.SendingNick:
      ctx.reply("Ваш ник " + ctx.message.text);
    default:
  }
});

bot.action("msg", (ctx) => {
  ctx.session.state = BotState.Chatting;
  ctx.answerCbQuery();
  ctx.editMessageText("Следующее ваше сообщение будет переслано в предложку", {
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
  ctx.editMessageText("Выбрать одну из функций:", {
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
  ctx.editMessageText(
    "Введите количество лакоинов которое хотите купить(в числах)"
  );
});

bot.on("photo", (ctx) => {
  if (ctx.chat.id != adminChatId) {
    console.log(adminChatId);
    ctx.forwardMessage(adminChatId);
    сtx.reply("Сообщение было отправлено", {
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
      },
    });
  }
});

bot.launch();
