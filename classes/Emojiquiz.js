const mysql = require("mysql2/promise");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const { emojiquizContent } = require("./EmojiquizContent.js");

module.exports = class Emojiquiz {
  constructor(
    host,
    user,
    password,
    database,
    charset = "utf8mb4",
    bigNumbers = true,
    word,
    hint,
    searched_word,
    interaction,
    pending_channel,
    channel,
    message,
    button,
    delete_emojiquiz
  ) {
    this.host = host;
    this.user = user;
    this.password = password;
    this.database = database;
    this.charset = charset;
    this.bigNumbers = bigNumbers;
    this.word = word;
    this.hint = hint;
    this.searched_word = searched_word;
    this.interaction = interaction;
    this.pending_channel = pending_channel;
    this.channel = channel;
    this.message = message;
    this.button = button;
    this.delete = delete_emojiquiz;
    this.pool = null;
  }

  #createConnection() {
    if (this.pool) return this.pool;
    this.pool = mysql.createPool({
      host: this.host,
      user: this.user,
      password: this.password,
      database: this.database,
      charset: this.charset,
      supportBigNumbers: this.bigNumbers,
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: false,
    });
    return this.pool;
  }

  async ready() {
    this.#createConnection();
    const sql = `CREATE TABLE IF NOT EXISTS emojiquiz (
      guildID BIGINT UNSIGNED PRIMARY KEY,
      guildName VARCHAR(255),
      pendingChannelID BIGINT UNSIGNED,
      channelID BIGINT UNSIGNED,
      currentEmoji VARCHAR(255),
      emojiMsgID BIGINT UNSIGNED,
      bulkDeleteCounter INT DEFAULT 0,
      pendingData LONGTEXT,
      data LONGTEXT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

    try {
      await this.pool.query(sql);
      console.log("Successfully ensured emojiquiz table!");
    } catch (err) {
      console.error("Table creation failed:", err?.message || err);
    }
  }

  async #getGuildRow(guildId) {
    const [rows] = await this.pool.query(
      "SELECT * FROM emojiquiz WHERE guildID = ?",
      [String(guildId)]
    );
    return rows?.[0] || null;
  }

  async #updateData(guildId, data) {
    await this.pool.query("UPDATE emojiquiz SET data = ? WHERE guildID = ?", [
      JSON.stringify(data),
      String(guildId),
    ]);
  }

  async #updatePendingData(guildId, pendingData) {
    await this.pool.query(
      "UPDATE emojiquiz SET pendingData = ? WHERE guildID = ?",
      [JSON.stringify(pendingData), String(guildId)]
    );
  }

  async createEmojiQuiz() {
    this.#createConnection();
    const interaction = this.interaction;
    const guildId = String(interaction.guildId);

    const word = this.word;
    const hint = this.hint;
    const searched = this.searched_word;

    const row = await this.#getGuildRow(guildId);

    // If exists, check duplicates
    if (row) {
      const data = Array.isArray(row.data)
        ? row.data
        : JSON.parse(row.data || "[]");
      const dup = data.find((e) => e.word === word || e.searched === searched);
      if (dup) {
        try {
          await interaction.reply({
            content: emojiquizContent.alreadyExist.create_new_quiz_text,
            ephemeral: true,
          });
        } catch (_) {}
        return;
      }
    }

    const emoji_embed = new EmbedBuilder()
      .setTitle(`${emojiquizContent.title}`)
      .setDescription(`${emojiquizContent.description}`)
      .addFields(
        { name: `${emojiquizContent.fields.first}`, value: word, inline: true },
        { name: `${emojiquizContent.fields.second}`, value: hint, inline: true }
      )
      .setColor(`${emojiquizContent.color}`)
      .setFooter({
        text: `${emojiquizContent.footer.text}`,
        iconURL: `${emojiquizContent.footer.iconURL}`,
      });

    try {
      await interaction.reply({
        content: `${emojiquizContent.solution} **${searched}**`,
        embeds: [emoji_embed],
        ephemeral: true,
      });
    } catch (_) {}

    if (!row) {
      const initial = [{ word, hint, searched }];
      await this.pool.query(
        "INSERT INTO emojiquiz (guildID, guildName, data) VALUES (?, ?, ?)",
        [guildId, interaction.member.guild.name, JSON.stringify(initial)]
      );
    } else {
      const current = JSON.parse(row.data || "[]");
      current.push({ word, hint, searched });
      await this.#updateData(guildId, current);
    }
  }

  async deleteEmojiQuiz() {
    this.#createConnection();
    const interaction = this.interaction;
    const guildId = String(interaction.guildId);
    const toDelete = this.delete;

    const row = await this.#getGuildRow(guildId);
    if (!row) {
      return interaction.reply({
        content: "Nothing in the database",
        ephemeral: true,
      });
    }

    const data = JSON.parse(row.data || "[]");
    const filtered = data.filter((el) => el.word !== toDelete);
    await this.#updateData(guildId, filtered);

    const row2 = await this.#getGuildRow(guildId);
    if (!row2) return;
    try {
      const channel = interaction.guild.channels.cache.get(
        String(row2.channelID)
      );
      if (channel) {
        await channel.bulkDelete((row2.bulkDeleteCounter || 0) + 2);
      }

      await this.pool.query(
        "UPDATE emojiquiz SET bulkDeleteCounter = 0 WHERE guildID = ?",
        [guildId]
      );

      const poolData = JSON.parse(row.data || "[]");
      if (poolData.length) {
        for (let i = poolData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [poolData[i], poolData[j]] = [poolData[j], poolData[i]];
        }

        const next = poolData[0];
        const emoji_embed = new EmbedBuilder()
          .setTitle(`${emojiquizContent.title}`)
          .setDescription(`${emojiquizContent.description}`)
          .addFields(
            {
              name: `${emojiquizContent.fields.first}`,
              value: next.word,
              inline: true,
            },
            {
              name: `${emojiquizContent.fields.second}`,
              value: next.hint,
              inline: true,
            }
          )
          .setColor(`${emojiquizContent.color}`)
          .setFooter({
            text: `${interaction.user.tag} ${emojiquizContent.footer.textonstart}`,
            iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png?size=256`,
          });

        const emojiquiz_btns = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.skip.label)
            .setCustomId("skip_word")
            .setStyle(emojiquizContent.buttons.skip.style)
            .setEmoji(emojiquizContent.buttons.skip.emoji),
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.first_letter.label)
            .setCustomId("first_letter")
            .setStyle(emojiquizContent.buttons.first_letter.style)
            .setEmoji(emojiquizContent.buttons.first_letter.emoji),
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.suggest_new_quiz.label)
            .setCustomId("suggest_new_quiz")
            .setStyle(emojiquizContent.buttons.suggest_new_quiz.style)
            .setEmoji(emojiquizContent.buttons.suggest_new_quiz.emoji)
        );

        if (channel) {
          const sent = await channel.send({
            embeds: [emoji_embed],
            components: [emojiquiz_btns],
          });
          await this.pool.query(
            "UPDATE emojiquiz SET guildName = ?, channelID = ?, currentEmoji = ?, emojiMsgID = ? WHERE guildID = ?",
            [
              interaction.guild.name,
              String(interaction.channel.id),
              next.word,
              String(sent.id),
              guildId,
            ]
          );
        }
      }

      const latest = await this.#getGuildRow(guildId);
      const remaining = JSON.parse(latest?.data || "[]");
      if (remaining.length === 0) {
        await this.pool.query("DELETE FROM emojiquiz WHERE guildID = ?", [
          guildId,
        ]);
      }
    } catch (_) {}

    try {
      const embed = new EmbedBuilder()
        .setColor("#FFFFFF")
        .setDescription(`Successfully reseted ${toDelete}!`)
        .setFooter({
          text: "Emojiquiz",
          iconURL: emojiquizContent.footer.iconURL,
        });
      const exists = data.find((e) => e.word === toDelete);
      if (exists) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        embed.setDescription(`${toDelete} has never been setuped!`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (_) {}
  }

  async resetEmojiQuiz() {
    this.#createConnection();
    const interaction = this.interaction;
    const guildId = String(interaction.guildId);

    await this.pool.query("DELETE FROM emojiquiz WHERE guildID = ?", [guildId]);

    try {
      await interaction.reply({
        content: "You successfully reseted the bot. ✅",
        ephemeral: true,
      });
    } catch (_) {}
  }

  async setup() {
    this.#createConnection();
    const interaction = this.interaction;
    const guildId = String(interaction.guildId);

    const row = await this.#getGuildRow(guildId);

    const emojiquiz_btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.skip.label)
        .setCustomId("skip_word")
        .setStyle(emojiquizContent.buttons.skip.style)
        .setEmoji(emojiquizContent.buttons.skip.emoji),
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.first_letter.label)
        .setCustomId("first_letter")
        .setStyle(emojiquizContent.buttons.first_letter.style)
        .setEmoji(emojiquizContent.buttons.first_letter.emoji),
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.suggest_new_quiz.label)
        .setCustomId("suggest_new_quiz")
        .setStyle(emojiquizContent.buttons.suggest_new_quiz.style)
        .setEmoji(emojiquizContent.buttons.suggest_new_quiz.emoji)
    );

    if (row) {
      const list = JSON.parse(row.data || "[]");
      // shuffle
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }

      const first = list[0];
      const emoji_embed = new EmbedBuilder()
        .setTitle(`${emojiquizContent.title}`)
        .setDescription(`${emojiquizContent.description}`)
        .addFields(
          {
            name: `${emojiquizContent.fields.first}`,
            value: first.word,
            inline: true,
          },
          {
            name: `${emojiquizContent.fields.second}`,
            value: first.hint,
            inline: true,
          }
        )
        .setColor(`${emojiquizContent.color}`)
        .setFooter({
          text: `${emojiquizContent.footer.text}`,
          iconURL: `${emojiquizContent.footer.iconURL}`,
        });

      try {
        await interaction.reply({
          content: `Successfully setuped emojiquiz. ✅`,
          ephemeral: true,
        });
        const sent = await this.channel.send({
          embeds: [emoji_embed],
          components: [emojiquiz_btns],
        });
        await this.pool.query(
          "UPDATE emojiquiz SET guildName = ?, pendingChannelID = ?, channelID = ?, currentEmoji = ?, emojiMsgID = ? WHERE guildID = ?",
          [
            interaction.member.guild.name,
            String(this.pending_channel.id),
            String(this.channel.id),
            first.word,
            String(sent.id),
            guildId,
          ]
        );
      } catch (_) {}
    } else {
      const embed = new EmbedBuilder()
        .setColor("#FFFFFF")
        .setDescription(
          `You need to do **/emojiquiz-create** first before you can setup the emojiquiz. 😀`
        );
      try {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (_) {}
    }
  }

  async start() {
    this.#createConnection();
    const msg = this.message;
    const guildId = String(msg.guildId);

    const row = await this.#getGuildRow(guildId);
    if (!row) return;

    if (msg.author.bot) return;
    if (String(row.channelID) !== String(msg.channelId)) return;

    const newCounter = (row.bulkDeleteCounter || 0) + 1;
    await this.pool.query(
      "UPDATE emojiquiz SET bulkDeleteCounter = ? WHERE guildID = ?",
      [newCounter, guildId]
    );

    const list = JSON.parse(row.data || "[]");
    const currentEmoji = row.currentEmoji;
    const entry = list.find((e) => e.word === currentEmoji);

    if (entry && entry.searched.toLowerCase() === msg.content.toLowerCase()) {
      try {
        await msg.react(emojiquizContent.word_reaction.right_word);
      } catch (_) {}

      const row2 = await this.#getGuildRow(guildId);
      try {
        await msg.channel.bulkDelete((row2.bulkDeleteCounter || 0) + 2);
        await this.pool.query(
          "UPDATE emojiquiz SET bulkDeleteCounter = 0 WHERE guildID = ?",
          [guildId]
        );

        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }

        const next = list[0];
        const emoji_embed = new EmbedBuilder()
          .setTitle(`${emojiquizContent.title}`)
          .setDescription(`${emojiquizContent.description}`)
          .addFields(
            {
              name: `${emojiquizContent.fields.first}`,
              value: next.word,
              inline: true,
            },
            {
              name: `${emojiquizContent.fields.second}`,
              value: next.hint,
              inline: true,
            }
          )
          .setColor(`${emojiquizContent.color}`)
          .setFooter({
            text: `${msg.author.tag} ${emojiquizContent.footer.textonstart}`,
            iconURL: `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=256`,
          });

        const emojiquiz_btns = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.skip.label)
            .setCustomId("skip_word")
            .setStyle(emojiquizContent.buttons.skip.style)
            .setEmoji(emojiquizContent.buttons.skip.emoji),
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.first_letter.label)
            .setCustomId("first_letter")
            .setStyle(emojiquizContent.buttons.first_letter.style)
            .setEmoji(emojiquizContent.buttons.first_letter.emoji),
          new ButtonBuilder()
            .setLabel(emojiquizContent.buttons.suggest_new_quiz.label)
            .setCustomId("suggest_new_quiz")
            .setStyle(emojiquizContent.buttons.suggest_new_quiz.style)
            .setEmoji(emojiquizContent.buttons.suggest_new_quiz.emoji)
        );

        const sent = await msg.channel.send({
          embeds: [emoji_embed],
          components: [emojiquiz_btns],
        });
        await this.pool.query(
          "UPDATE emojiquiz SET guildName = ?, channelID = ?, currentEmoji = ?, emojiMsgID = ? WHERE guildID = ?",
          [
            msg.guild.name,
            String(msg.channel.id),
            next.word,
            String(sent.id),
            guildId,
          ]
        );
      } catch (_) {}
    } else {
      try {
        await msg.react(emojiquizContent.word_reaction.wrong_word);
      } catch (_) {}
    }

    if ((row.bulkDeleteCounter || 0) > 30) {
      await this.pool.query(
        "UPDATE emojiquiz SET bulkDeleteCounter = 0 WHERE guildID = ?",
        [guildId]
      );
    }
  }

  async skip() {
    this.#createConnection();
    const btn = this.button;
    if (!btn.isButton() || btn.customId !== "skip_word") return;

    const guildId = String(btn.guildId);
    const row = await this.#getGuildRow(guildId);
    if (!row) return;

    try {
      await btn.channel.bulkDelete((row.bulkDeleteCounter || 0) + 2);
      await this.pool.query(
        "UPDATE emojiquiz SET bulkDeleteCounter = 0 WHERE guildID = ?",
        [guildId]
      );

      const list = JSON.parse(row.data || "[]");
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }

      const next = list[0];
      const emoji_embed = new EmbedBuilder()
        .setTitle(emojiquizContent.title)
        .setDescription(emojiquizContent.description)
        .addFields(
          {
            name: emojiquizContent.fields.first,
            value: next.word,
            inline: true,
          },
          {
            name: emojiquizContent.fields.second,
            value: next.hint,
            inline: true,
          }
        )
        .setColor(emojiquizContent.color)
        .setFooter({
          text: `${btn.user.tag} ${emojiquizContent.footer.skip_text}`,
          iconURL: `https://cdn.discordapp.com/avatars/${btn.user.id}/${btn.user.avatar}.png?size=256`,
        });

      const emojiquiz_btns = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(emojiquizContent.buttons.skip.label)
          .setCustomId("skip_word")
          .setStyle(emojiquizContent.buttons.skip.style)
          .setEmoji(emojiquizContent.buttons.skip.emoji),
        new ButtonBuilder()
          .setLabel(emojiquizContent.buttons.first_letter.label)
          .setCustomId("first_letter")
          .setStyle(emojiquizContent.buttons.first_letter.style)
          .setEmoji(emojiquizContent.buttons.first_letter.emoji),
        new ButtonBuilder()
          .setLabel(emojiquizContent.buttons.suggest_new_quiz.label)
          .setCustomId("suggest_new_quiz")
          .setStyle(emojiquizContent.buttons.suggest_new_quiz.style)
          .setEmoji(emojiquizContent.buttons.suggest_new_quiz.emoji)
      );

      const sent = await btn.channel.send({
        embeds: [emoji_embed],
        components: [emojiquiz_btns],
      });
      await this.pool.query(
        "UPDATE emojiquiz SET guildName = ?, currentEmoji = ?, emojiMsgID = ? WHERE guildID = ?",
        [btn.member.guild.name, next.word, String(sent.id), guildId]
      );
    } catch (_) {}
  }

  async firstLetter() {
    this.#createConnection();
    const btn = this.button;
    if (!btn.isButton() || this.button.customId !== "first_letter") return;

    const guildId = String(btn.guildId);
    const row = await this.#getGuildRow(guildId);
    if (!row) return;

    try {
      const data = JSON.parse(row.data || "[]");
      const current = row.currentEmoji;
      const found = data.find((e) => e.word === current);
      if (!found) return;
      await btn.reply({
        content: `${emojiquizContent.first_letter_text} **${found.searched[0]}**.`,
        ephemeral: true,
      });
    } catch (_) {}
  }

  async #suggest_new_quiz_moderation() {
    const btn = this.button;
    const guildId = String(btn.guildId);
    const rolesAllowed = emojiquizContent.moderation_roles.roles;
    const hasModRole = btn.member.roles.cache
      .map((r) => r.name)
      .some((n) => rolesAllowed.includes(n));
    const isAdmin = btn.member.permissions.has([
      PermissionFlagsBits.Administrator,
    ]);

    const emojiquiz_moderation_btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.emojiquiz_decline.label)
        .setCustomId("emojiquiz_decline")
        .setStyle(emojiquizContent.buttons.emojiquiz_decline.style),
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.emojiquiz_accept.label)
        .setCustomId("emojiquiz_accept")
        .setStyle(emojiquizContent.buttons.emojiquiz_accept.style)
    );

    if (btn.customId === "emojiquiz_accept") {
      if (!hasModRole && !isAdmin) return;
      const row = await this.#getGuildRow(guildId);
      if (!row) return;
      const pending = JSON.parse(row.pendingData || "[]");
      const current = JSON.parse(row.data || "[]");
      const targetWord = btn.message.embeds?.[0]?.data?.fields?.[0]?.value;
      const newItem = pending.find((e) => e.word === targetWord);
      const filtered = pending.filter((e) => e.word !== targetWord);
      if (newItem) current.push(newItem);
      await this.pool.query(
        "UPDATE emojiquiz SET pendingData = ?, data = ? WHERE guildID = ?",
        [JSON.stringify(filtered), JSON.stringify(current), guildId]
      );

      try {
        emojiquiz_moderation_btns.components[0].setDisabled(true);
        emojiquiz_moderation_btns.components[1].setDisabled(true);
        const msg = await btn.member.guild.channels.cache
          .get(btn.message.channelId)
          .messages.fetch(btn.message.id);
        const embed = new EmbedBuilder(msg.embeds[0].fields)
          .addFields(
            {
              name: msg.embeds[0].fields[0].name,
              value: msg.embeds[0].fields[0].value,
              inline: true,
            },
            {
              name: msg.embeds[0].fields[1].name,
              value: msg.embeds[0].fields[1].value,
              inline: true,
            },
            {
              name: emojiquizContent.moderation_status.accept_text,
              value: emojiquizContent.moderation_status.accept_status,
              inline: false,
            }
          )
          .setTitle(emojiquizContent.title)
          .setDescription(emojiquizContent.description)
          .setColor(emojiquizContent.moderation_status.accept_color)
          .setFooter({
            text: `${btn.user.tag}`,
            iconURL: `https://cdn.discordapp.com/avatars/${btn.user.id}/${btn.user.avatar}.png?size=256`,
          });

        await btn.deferUpdate();
        await btn.editReply({
          embeds: [embed],
          components: [emojiquiz_moderation_btns],
        });
        await btn.followUp({
          content: `You successfully accepted **${btn.message.embeds[0].data.footer.text}** emojiquiz suggestion. ✅`,
          ephemeral: true,
        });
      } catch (_) {}
    } else if (btn.customId === "emojiquiz_decline") {
      if (!hasModRole && !isAdmin) return;
      const row = await this.#getGuildRow(guildId);
      if (!row) return;
      const pending = JSON.parse(row.pendingData || "[]");
      const targetWord = btn.message.embeds?.[0]?.data?.fields?.[0]?.value;
      const filtered = pending.filter((e) => e.word !== targetWord);
      await this.#updatePendingData(guildId, filtered);

      try {
        emojiquiz_moderation_btns.components[0].setDisabled(true);
        emojiquiz_moderation_btns.components[1].setDisabled(true);
        const msg = await btn.member.guild.channels.cache
          .get(btn.message.channelId)
          .messages.fetch(btn.message.id);
        const embed = new EmbedBuilder(msg.embeds[0].fields)
          .addFields(
            {
              name: msg.embeds[0].fields[0].name,
              value: msg.embeds[0].fields[0].value,
              inline: true,
            },
            {
              name: msg.embeds[0].fields[1].name,
              value: msg.embeds[0].fields[1].value,
              inline: true,
            },
            {
              name: emojiquizContent.moderation_status.decline_text,
              value: emojiquizContent.moderation_status.decline_status,
              inline: false,
            }
          )
          .setTitle(emojiquizContent.title)
          .setDescription(emojiquizContent.description)
          .setColor(emojiquizContent.moderation_status.decline_color)
          .setFooter({
            text: `${btn.user.tag}`,
            iconURL: `https://cdn.discordapp.com/avatars/${btn.user.id}/${btn.user.avatar}.png?size=256`,
          });

        await btn.deferUpdate();
        await btn.editReply({
          embeds: [embed],
          components: [emojiquiz_moderation_btns],
        });
        await btn.followUp({
          content: `You declined **${btn.message.embeds[0].data.footer.text}** emojiquiz suggestion. ❌`,
          ephemeral: true,
        });
      } catch (_) {}
    }
  }

  async suggest_new_quiz() {
    await this.#suggest_new_quiz_moderation();

    const btn = this.button;
    const guildId = String(btn.guildId);

    const emojiquiz_moderation_btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.emojiquiz_decline.label)
        .setCustomId("emojiquiz_decline")
        .setStyle(emojiquizContent.buttons.emojiquiz_decline.style),
      new ButtonBuilder()
        .setLabel(emojiquizContent.buttons.emojiquiz_accept.label)
        .setCustomId("emojiquiz_accept")
        .setStyle(emojiquizContent.buttons.emojiquiz_accept.style)
    );

    try {
      if (btn.isButton() && btn.customId === "suggest_new_quiz") {
        const modal = new ModalBuilder()
          .setCustomId("emojiquiz")
          .setTitle(emojiquizContent.suggest_new_quiz_pop_up.title)
          .addComponents([
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("emoji_word_input")
                .setLabel(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_word.label
                )
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_word
                    .placeholder
                )
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("hint_word_input")
                .setLabel(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_hint.label
                )
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_hint
                    .placeholder
                )
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("searched_word_input")
                .setLabel(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_searched.label
                )
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder(
                  emojiquizContent.suggest_new_quiz_pop_up.emoji_searched
                    .placeholder
                )
                .setRequired(true)
            ),
          ]);

        await btn.showModal(modal);
      }

      if (btn.type === InteractionType.ModalSubmit) {
        const emoji_word_response =
          btn.fields.getTextInputValue("emoji_word_input");
        const hint_word_response =
          btn.fields.getTextInputValue("hint_word_input");
        const searched_word_response = btn.fields.getTextInputValue(
          "searched_word_input"
        );

        const row = await this.#getGuildRow(guildId);
        if (!row) return;

        const data = JSON.parse(row.data || "[]");
        const dup = data.find(
          (e) =>
            e.word === emoji_word_response ||
            e.searched === searched_word_response
        );
        if (dup) {
          return await btn.reply({
            content: emojiquizContent.alreadyExist.suggest_new_quiz_text,
            ephemeral: true,
          });
        }

        await btn.reply({
          content: `Your emojiquiz suggestion is submitted!\n**word:** ${emoji_word_response}\n**hint:** ${hint_word_response}\n**searched:** ${searched_word_response}`,
          ephemeral: true,
        });

        const emoji_embed = new EmbedBuilder()
          .setTitle(emojiquizContent.title)
          .setDescription(emojiquizContent.description)
          .addFields(
            {
              name: emojiquizContent.fields.first,
              value: emoji_word_response,
              inline: true,
            },
            {
              name: emojiquizContent.fields.second,
              value: hint_word_response,
              inline: true,
            },
            {
              name: emojiquizContent.fields.status_text,
              value: emojiquizContent.fields.status,
              inline: false,
            }
          )
          .setColor(emojiquizContent.moderation_status.pending_color)
          .setFooter({
            text: `${btn.user.tag}`,
            iconURL: `https://cdn.discordapp.com/avatars/${btn.user.id}/${btn.user.avatar}.png?size=256`,
          });

        const modChannel = btn.member.guild.channels.cache.get(
          String(row.pendingChannelID)
        );
        if (modChannel) {
          await modChannel.send({
            content: `${emojiquizContent.moderation_status.solution}: **${searched_word_response}**`,
            embeds: [emoji_embed],
            components: [emojiquiz_moderation_btns],
          });
        }

        const pending = JSON.parse(row.pendingData || "[]");
        pending.push({
          word: emoji_word_response,
          hint: hint_word_response,
          searched: searched_word_response,
        });
        await this.#updatePendingData(guildId, pending);
      }
    } catch (_) {}
  }
};
