/**
 * Discord.js v14 — OF&A Gig Bot
 *
 * Commands:
 * /new-gig          → choose Cast or Crew → tag picker → modal → forum post
 * /new-casting-call → shortcut directly to casting call flow
 * /post-verify-button → post verification landing button
 * /post-roles-button → post role select dropdowns in #roles
 *
 * Setup:
 * npm install discord.js dotenv
 *
 * .env:
 * BOT_TOKEN=your_bot_token
 * CLIENT_ID=your_application_id
 * GUILD_ID=your_guild_id
 * CASTING_FORUM_CHANNEL_ID=your_casting_calls_forum_channel_id
 * CREW_FORUM_CHANNEL_ID=your_crew_calls_forum_channel_id
 * ROLE_MAP={"member":"ID","actor":"ID",...}
 *
 * Deploy commands once:
 * node casting-call-bot.js --deploy
 *
 * Run:
 * node casting-call-bot.js
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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  Events,
} = require("discord.js");

// ─── Config ───────────────────────────────────────────────────────────────────

const {
  BOT_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  CASTING_FORUM_CHANNEL_ID,
  CREW_FORUM_CHANNEL_ID,
} = process.env;

// Parse the role map safely from Render environment variable
let ROLE_MAP = {};
try {
  ROLE_MAP = process.env.ROLE_MAP ? JSON.parse(process.env.ROLE_MAP) : {};
} catch (err) {
  console.error("❌ Failed to parse ROLE_MAP JSON environment variable:", err);
}

// Custom ID constants — gig type is appended as a suffix: e.g. "tag_select:cast"
const GIG_TYPE_BUTTON_PREFIX = "gig_type:";   // gig_type:cast | gig_type:crew
const TAG_SELECT_PREFIX      = "tag_select:";  // tag_select:cast:TAG_ID (select menu)
const MODAL_PREFIX           = "gig_modal:";   // gig_modal:cast:TAG_ID
const OPEN_GIG_PICKER_ID     = "open_gig_picker"; // persistent channel button
const VERIFY_BUTTON_ID       = "verify_member";    // #welcome-and-rules agree button
const CRAFT_SELECT_ID        = "role_select:craft";
const LOCATION_SELECT_ID     = "role_select:location";

// ─── Slash commands ───────────────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName("new-gig")
    .setDescription("Post a new casting call or crew call")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("post-gig-button")
    .setDescription("Post the permanent 'Submit a Gig' button in this channel (admin only)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("post-verify-button")
    .setDescription("Post the 'I Agree' verification button in this channel (admin only, run once)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("post-roles-button")
    .setDescription("Post the role picker menus in this channel (admin only, run once)")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("new-casting-call")
    .setDescription("Post a new casting call to #casting-calls")
    .toJSON(),
];

// ─── Deploy (node casting-call-bot.js --deploy) ───────────────────────────────

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
  return;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function forumChannelId(gigType) {
  return gigType === "crew" ? CREW_FORUM_CHANNEL_ID : CASTING_FORUM_CHANNEL_ID;
}

function gigLabel(gigType) {
  return gigType === "crew" ? "Crew Call" : "Casting Call";
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function buildCastingModal(tagId = "none") {
  const modal = new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}cast:${tagId}`)
    .setTitle("New Casting Call");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("project_title")
        .setLabel("Project Title")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. Indie Short Film — 'The Last Station'")
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("compensation")
        .setLabel("Compensation")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. Paid — $200/day, Copy/Credit, Deferred")
        .setRequired(true)
        .setMaxLength(200)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("location_and_dates")
        .setLabel("Location & Dates")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. OKC | Auditions: Aug 5–6, Shoot: Aug 20–24")
        .setRequired(true)
        .setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("character_breakdown")
        .setLabel("Character Breakdown")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("List each role: age range, gender, ethnicity, description.")
        .setRequired(true)
        .setMaxLength(1800)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("submission_instructions")
        .setLabel("Submission Instructions")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("How to apply: email, self-tape specs, deadline, etc.")
        .setRequired(true)
        .setMaxLength(1000)
    )
  );

  return modal;
}

function buildCrewModal(tagId = "none") {
  const modal = new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}crew:${tagId}`)
    .setTitle("New Crew Call");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("project_title")
        .setLabel("Project Title")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. Indie Feature — 'Red Dirt'")
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("compensation")
        .setLabel("Compensation")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. Paid — $250/day, Deferred, Copy/Credit")
        .setRequired(true)
        .setMaxLength(200)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("location_and_dates")
        .setLabel("Location & Dates")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("e.g. Tulsa, OK | Shoot: Sept 10–18, 2026")
        .setRequired(true)
        .setMaxLength(300)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("positions_needed")
        .setLabel("Positions Needed")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("e.g. DP, Sound Mixer, Gaffer — include experience/gear needs")
        .setRequired(true)
        .setMaxLength(1800)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("submission_instructions")
        .setLabel("Submission Instructions")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("How to apply: email, portfolio/reel link, deadline, etc.")
        .setRequired(true)
        .setMaxLength(1000)
    )
  );

  return modal;
}

// ─── Post formatters ──────────────────────────────────────────────────────────

function formatCastingPost(fields) {
  return [
    `## 🎬 Casting Call`,
    ``,
    `**💰 Compensation**`,
    fields.compensation,
    ``,
    `**📍 Location & Dates**`,
    fields.location_and_dates,
    ``,
    `**🎭 Character Breakdown**`,
    fields.character_breakdown,
    ``,
    `**📬 How to Submit**`,
    fields.submission_instructions,
    ``,
    `---`,
    `*Posted by ${fields.postedBy} via /new-casting-call*`,
  ].join("\n");
}

function formatCrewPost(fields) {
  return [
    `## 🎥 Crew Call`,
    ``,
    `**💰 Compensation**`,
    fields.compensation,
    ``,
    `**📍 Location & Dates**`,
    fields.location_and_dates,
    ``,
    `**🛠️ Positions Needed**`,
    fields.positions_needed,
    ``,
    `**📬 How to Apply**`,
    fields.submission_instructions,
    ``,
    `---`,
    `*Posted by ${fields.postedBy} via /new-gig*`,
  ].join("\n");
}

// ─── Tag picker ───────────────────────────────────────────────────────────────

async function showTagPicker(interaction, gigType) {
  const channelId = forumChannelId(gigType);
  const forumChannel = await client.channels.fetch(channelId);

  if (!forumChannel?.availableTags?.length) {
    const modal = gigType === "crew"
      ? buildCrewModal("none")
      : buildCastingModal("none");
    await interaction.showModal(modal);
    return;
  }

  const options = forumChannel.availableTags.map((tag) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(tag.name)
      .setValue(`${gigType}:${tag.id}`)
      .setEmoji(tag.emoji?.name ?? "🏷️")
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${TAG_SELECT_PREFIX}${gigType}`)
    .setPlaceholder(`Choose a category for this ${gigLabel(gigType)}…`)
    .addOptions(options);

  await interaction.reply({
    content: `**Step 2 of 3** — Pick a tag for your ${gigLabel(gigType)} post:`,
    components: [new ActionRowBuilder().addComponents(select)],
    flags: MessageFlags.Ephemeral,
  });
}

// ─── Client ───────────────────────────────────────────────────────────────────

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);

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

  // ── /post-verify-button → post the I Agree button in this channel ──────────
  if (interaction.isChatInputCommand() && interaction.commandName === "post-verify-button") {
    const verifyButton = new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("I have read and agree to the rules")
      .setStyle(ButtonStyle.Success);

    await interaction.channel.send({
      content: "## Welcome to Oklahoma Filmmakers & Actors\nPlease read the rules above, then click below to gain access to the rest of the server.",
      components: [new ActionRowBuilder().addComponents(verifyButton)],
    });

    await interaction.reply({
      content: "✅ Verification button posted. Pin that message so it stays at the top.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── Verify button click → assign Member role from ROLE_MAP ──────────────────
  if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
    const member = interaction.member;
    const memberRoleId = ROLE_MAP["member"];

    if (!memberRoleId) {
      await interaction.reply({
        content: "❌ Member role configuration missing in ROLE_MAP. Please contact an admin.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (member.roles.cache.has(memberRoleId)) {
      await interaction.reply({
        content: "You already have access — welcome back!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.add(memberRoleId);
      await interaction.reply({
        content: "Welcome to the server — you now have full access. Head to **#introductions** and say hello, and don't forget to hop into **#roles** to choose your tags!",
        flags: MessageFlags.Ephemeral,
      });

      // ─── OPTION 1: LOG TO ADMIN CHANNEL ───
      const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'moderator-only');
      if (logChannel) {
        await logChannel.send({
          content: `✅ **${interaction.user.tag}** (ID: \`${interaction.user.id}\`) has accepted the server rules and has been given the **Member** role.`
        });
      }
    } catch (err) {
      console.error("Failed to assign Member role:", err);
      await interaction.reply({
        content: "Something went wrong assigning your role. Please contact an admin.",
        flags: MessageFlags.Ephemeral,
      });
    }
    return;
  }

  // ── /post-roles-button → post the dropdown menus in #roles ──────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === "post-roles-button") {
    const craftSelect = new StringSelectMenuBuilder()
      .setCustomId(CRAFT_SELECT_ID)
      .setPlaceholder("Select a role to add or remove it...")
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("Stunts").setValue("stunts"),
        new StringSelectMenuOptionBuilder().setLabel("Director").setValue("director"),
        new StringSelectMenuOptionBuilder().setLabel("Producer").setValue("producer"),
        new StringSelectMenuOptionBuilder().setLabel("Wardrobe").setValue("wardrobe"),
        new StringSelectMenuOptionBuilder().setLabel("Props").setValue("props"),
        new StringSelectMenuOptionBuilder().setLabel("Cinematographer").setValue("cinematographer"),
        new StringSelectMenuOptionBuilder().setLabel("Student Filmmaker").setValue("student_filmmaker"),
        new StringSelectMenuOptionBuilder().setLabel("Casting").setValue("casting"),
        new StringSelectMenuOptionBuilder().setLabel("Lighting").setValue("lighting"),
        new StringSelectMenuOptionBuilder().setLabel("Editor").setValue("editor"),
      ]);

    const locationSelect = new StringSelectMenuBuilder()
      .setCustomId(LOCATION_SELECT_ID)
      .setPlaceholder("Select your Location base...")
      .addOptions([
        new StringSelectMenuOptionBuilder().setLabel("OKC Area").setValue("okc").setEmoji("🏙️"),
        new StringSelectMenuOptionBuilder().setLabel("Tulsa Area").setValue("tulsa").setEmoji("🌇"),
      ]);

    await interaction.channel.send({
      content: "## Community Roles\nSelect your craft and location using the menus below. Selecting a role you already have will remove it. You can update your selections any time.",
      components: [
        new ActionRowBuilder().addComponents(craftSelect),
        new ActionRowBuilder().addComponents(locationSelect)
      ],
    });

    await interaction.reply({
      content: "✅ Role picker menus posted successfully.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── Handle Craft/Role select menu updates (Toggle style) ────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === CRAFT_SELECT_ID) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const chosenValue = interaction.values[0];
    const roleId = ROLE_MAP[chosenValue];
    
    if (!roleId) {
      return interaction.editReply({ content: "❌ Role ID configuration missing in configuration. Please alert an admin." });
    }

    const member = interaction.member;
    const chosenLabel = interaction.component.options.find(o => o.value === chosenValue).label;

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.editReply({ content: `Removed the **${chosenLabel}** role.` });
    } else {
      await member.roles.add(roleId);
      return interaction.editReply({ content: `Added the **${chosenLabel}** role.` });
    }
  }

  // ── Handle Location select menu updates (Mutually exclusive style) ──────────
  if (interaction.isStringSelectMenu() && interaction.customId === LOCATION_SELECT_ID) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const chosenValue = interaction.values[0];
    const targetRoleId = ROLE_MAP[chosenValue];
    
    if (!targetRoleId) {
      return interaction.editReply({ content: "❌ Location role configuration missing in setup. Please alert an admin." });
    }

    const member = interaction.member;
    const locationKeys = ["okc", "tulsa"];
    
    // Remove alternative location roles to keep it mutually exclusive
    for (const key of locationKeys) {
      const existingId = ROLE_MAP[key];
      if (existingId && member.roles.cache.has(existingId) && existingId !== targetRoleId) {
        await member.roles.remove(existingId);
      }
    }

    await member.roles.add(targetRoleId);
    const chosenLabel = interaction.component.options.find(o => o.value === chosenValue).label;
    return interaction.editReply({ content: `Location updated to **${chosenLabel}**.` });
  }

  // ── /new-gig → show Cast or Crew buttons ───────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === "new-gig") {
    const castButton = new ButtonBuilder()
      .setCustomId(`${GIG_TYPE_BUTTON_PREFIX}cast`)
      .setLabel("🎭 Casting Call")
      .setStyle(ButtonStyle.Primary);

    const crewButton = new ButtonBuilder()
      .setCustomId(`${GIG_TYPE_BUTTON_PREFIX}crew`)
      .setLabel("🎥 Crew Call")
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      content: "**Step 1 of 3** — What type of gig are you posting?",
      components: [new ActionRowBuilder().addComponents(castButton, crewButton)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── /post-gig-button → post permanent button message in this channel ───────
  if (interaction.isChatInputCommand() && interaction.commandName === "post-gig-button") {
    const button = new ButtonBuilder()
      .setCustomId(OPEN_GIG_PICKER_ID)
      .setLabel("🎬 Submit a Gig")
      .setStyle(ButtonStyle.Primary);

    await interaction.channel.send({
      content: "## 📋 Submit a Gig\nPosting a casting call or crew call? Click below to get started.",
      components: [new ActionRowBuilder().addComponents(button)],
    });

    await interaction.reply({
      content: "✅ Button posted!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── Persistent channel button → show Cast/Crew picker ─────────────────────
  if (interaction.isButton() && interaction.customId === OPEN_GIG_PICKER_ID) {
    const castButton = new ButtonBuilder()
      .setCustomId(`${GIG_TYPE_BUTTON_PREFIX}cast`)
      .setLabel("🎭 Casting Call")
      .setStyle(ButtonStyle.Primary);

    const crewButton = new ButtonBuilder()
      .setCustomId(`${GIG_TYPE_BUTTON_PREFIX}crew`)
      .setLabel("🎥 Crew Call")
      .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
      content: "**Step 1 of 3** — What type of gig are you posting?",
      components: [new ActionRowBuilder().addComponents(castButton, crewButton)],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ── /new-casting-call → skip straight to casting tag picker ────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === "new-casting-call") {
    await showTagPicker(interaction, "cast");
    return;
  }

  // ── Cast/Crew button → show tag picker for chosen channel ──────────────────
  if (interaction.isButton() && interaction.customId.startsWith(GIG_TYPE_BUTTON_PREFIX)) {
    const gigType = interaction.customId.replace(GIG_TYPE_BUTTON_PREFIX, "");
    await showTagPicker(interaction, gigType);
    return;
  }

  // ── Tag selected → open the right modal ────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith(TAG_SELECT_PREFIX)) {
    const gigType = interaction.customId.replace(TAG_SELECT_PREFIX, "");
    const tagId = interaction.values[0].split(":")[1];
    const modal = gigType === "crew"
      ? buildCrewModal(tagId)
      : buildCastingModal(tagId);
    await interaction.showModal(modal);
    return;
  }

  // ── Modal submit → create forum thread ─────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId.startsWith(MODAL_PREFIX)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const [, gigType, tagId] = interaction.customId.split(":");
    const get = (id) => interaction.fields.getTextInputValue(id);
    const postedBy = interaction.user.toString();

    let postBody;
    if (gigType === "crew") {
      postBody = formatCrewPost({
        compensation:            get("compensation"),
        location_and_dates:      get("location_and_dates"),
        positions_needed:        get("positions_needed"),
        submission_instructions: get("submission_instructions"),
        postedBy,
      });
    } else {
      postBody = formatCastingPost({
        compensation:            get("compensation"),
        location_and_dates:      get("location_and_dates"),
        character_breakdown:     get("character_breakdown"),
        submission_instructions: get("submission_instructions"),
        postedBy,
      });
    }

    const projectTitle = get("project_title");

    try {
      const forumChannel = await client.channels.fetch(forumChannelId(gigType));

      if (!forumChannel?.isThreadOnly()) {
        await interaction.editReply({
          content: `❌ Could not find the ${gigLabel(gigType)} forum channel. Check your env vars.`,
        });
        return;
      }

      const appliedTags = tagId && tagId !== "none" ? [tagId] : [];

      const thread = await forumChannel.threads.create({
        name: projectTitle,
        message: { content: postBody },
        ...(appliedTags.length > 0 && { appliedTags }),
      });

      await interaction.editReply({
        content: `✅ ${gigLabel(gigType)} posted! → ${thread.url}`,
      });
    } catch (err) {
      console.error("Error creating forum thread:", err);
      await interaction.editReply({
        content: "❌ Something went wrong. Check the bot's permissions and try again.",
      });
    }
  }
});

client.login(BOT_TOKEN);

module.exports = {
  newGigButton: new ButtonBuilder()
    .setCustomId(`${GIG_TYPE_BUTTON_PREFIX}cast`)
    .setLabel("🎬 Post a Gig")
    .setStyle(ButtonStyle.Primary),
};
