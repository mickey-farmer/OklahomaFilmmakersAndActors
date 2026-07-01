/**
 * Discord.js v14 — Casting Call Bot
 *
 * Triggers: /new-casting-call slash command OR a "New Casting Call" button click.
 * Opens a 6-field modal. On submit, posts a formatted thread to a Forum Channel.
 *
 * Setup:
 *   npm install discord.js dotenv
 *
 * .env:
 *   BOT_TOKEN=your_bot_token
 *   CLIENT_ID=your_application_id
 *   GUILD_ID=your_guild_id          (for instant command deploy; remove for global)
 *   FORUM_CHANNEL_ID=your_forum_channel_id
 *
 * Run once to register commands:
 *   node casting-call-bot.js --deploy
 *
 * Then run normally:
 *   node casting-call-bot.js
 */

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");

// ─── Config ──────────────────────────────────────────────────────────────────

const { BOT_TOKEN, CLIENT_ID, GUILD_ID, FORUM_CHANNEL_ID } = process.env;

const COMMAND_NAME = "new-casting-call";
const MODAL_ID = "casting_call_modal";
const BUTTON_ID = "open_casting_call_modal";

// ─── Slash command definition ─────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Post a new casting call to #casting-calls")
    .toJSON(),
];

// ─── Deploy commands (run with --deploy flag) ─────────────────────────────────

if (process.argv.includes("--deploy")) {
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

  (async () => {
    try {
      console.log("Registering slash commands…");

      const route = GUILD_ID
        ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
        : Routes.applicationCommands(CLIENT_ID);

      await rest.put(route, { body: commands });
      console.log("✅ Commands registered.");
    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  })();

  return; // Don't start the client during deploy
}

// ─── Build the modal ──────────────────────────────────────────────────────────

function buildCastingCallModal() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle("New Casting Call");

  const projectTitle = new TextInputBuilder()
    .setCustomId("project_title")
    .setLabel("Project Title")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Indie Short Film — 'The Last Station'")
    .setRequired(true)
    .setMaxLength(100);

  const compensation = new TextInputBuilder()
    .setCustomId("compensation")
    .setLabel("Compensation")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Paid — $200/day, Copy/Credit, Deferred, TBD")
    .setRequired(true)
    .setMaxLength(200);

  const location = new TextInputBuilder()
    .setCustomId("location")
    .setLabel("Location")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Los Angeles, CA / Remote / Hybrid")
    .setRequired(true)
    .setMaxLength(200);

  const dates = new TextInputBuilder()
    .setCustomId("dates")
    .setLabel("Dates")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Auditions: Aug 5–6 | Shoot: Aug 20–24, 2026")
    .setRequired(true)
    .setMaxLength(300);

  const characterBreakdown = new TextInputBuilder()
    .setCustomId("character_breakdown")
    .setLabel("Character Breakdown")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "List each role with age range, gender, ethnicity, and a brief description."
    )
    .setRequired(true)
    .setMaxLength(1800);

  const submissionInstructions = new TextInputBuilder()
    .setCustomId("submission_instructions")
    .setLabel("Submission Instructions")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      "How to apply: email, self-tape specs, deadline, contact info, etc."
    )
    .setRequired(true)
    .setMaxLength(1000);

  // Each TextInput must be in its own ActionRow (Discord's modal constraint)
  modal.addComponents(
    new ActionRowBuilder().addComponents(projectTitle),
    new ActionRowBuilder().addComponents(compensation),
    new ActionRowBuilder().addComponents(location),
    new ActionRowBuilder().addComponents(dates),
    new ActionRowBuilder().addComponents(characterBreakdown),
    new ActionRowBuilder().addComponents(submissionInstructions)
  );

  return modal;
}

// ─── Format the forum post body ───────────────────────────────────────────────

function formatPostBody(fields) {
  const { compensation, location, dates, character_breakdown, submission_instructions } =
    fields;

  return [
    `## 🎬 Casting Call`,
    ``,
    `**💰 Compensation**`,
    compensation,
    ``,
    `**📍 Location**`,
    location,
    ``,
    `**📅 Dates**`,
    dates,
    ``,
    `**🎭 Character Breakdown**`,
    character_breakdown,
    ``,
    `**📬 How to Submit**`,
    submission_instructions,
    ``,
    `---`,
    `*Posted by ${fields.postedBy} via /new-casting-call*`,
  ].join("\n");
}

// ─── Client ───────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  // Register slash commands on startup
  try {
    const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

// ─── Interaction handler ──────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  // 1. Slash command OR button → open the modal
  if (
    (interaction.isChatInputCommand() && interaction.commandName === COMMAND_NAME) ||
    (interaction.isButton() && interaction.customId === BUTTON_ID)
  ) {
    await interaction.showModal(buildCastingCallModal());
    return;
  }

  // 2. Modal submit → create forum thread
  if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
    await interaction.deferReply({ ephemeral: true });

    const get = (id) => interaction.fields.getTextInputValue(id);

    const projectTitle      = get("project_title");
    const compensation      = get("compensation");
    const location          = get("location");
    const dates             = get("dates");
    const characterBreakdown = get("character_breakdown");
    const submissionInstructions = get("submission_instructions");

    const postedBy = interaction.user.toString(); // mention

    const postBody = formatPostBody({
      compensation,
      location,
      dates,
      character_breakdown: characterBreakdown,
      submission_instructions: submissionInstructions,
      postedBy,
    });

    try {
      const forumChannel = await client.channels.fetch(FORUM_CHANNEL_ID);

      if (!forumChannel || !forumChannel.isThreadOnly()) {
        await interaction.editReply({
          content: "❌ Could not find the casting calls forum channel. Check `FORUM_CHANNEL_ID`.",
        });
        return;
      }

      const thread = await forumChannel.threads.create({
        name: projectTitle,
        message: { content: postBody },
      });

      await interaction.editReply({
        content: `✅ Casting call posted! → ${thread.url}`,
      });
    } catch (err) {
      console.error("Error creating forum thread:", err);
      await interaction.editReply({
        content: "❌ Something went wrong while posting. Check the bot's permissions and try again.",
      });
    }
  }
});

client.login(BOT_TOKEN);

// ─── Utility: export a ready-made button (optional) ──────────────────────────
// Drop this into any channel message to give users a button alternative.
//
// Usage in another file:
//   const { newCastingCallButton } = require('./casting-call-bot');
//
// Or just copy-paste the snippet below wherever you send the button message:
//
//   const row = new ActionRowBuilder().addComponents(
//     new ButtonBuilder()
//       .setCustomId('open_casting_call_modal')
//       .setLabel('🎬 New Casting Call')
//       .setStyle(ButtonStyle.Primary)
//   );
//   await channel.send({ content: 'Ready to post?', components: [row] });

module.exports = {
  newCastingCallButton: new ButtonBuilder()
    .setCustomId(BUTTON_ID)
    .setLabel("🎬 New Casting Call")
    .setStyle(ButtonStyle.Primary),
};
