**Oklahoma Filmmakers & Actors**

**Discord Server Setup Guide**

*Member Gating · Role Selection · Channel Structure · Welcome Messages · Bot Setup*

**1. Overview**

This document covers everything needed to configure the Oklahoma Filmmakers & Actors Discord server: a verification gate that keeps the main server visible only to members who accept the rules, self-assignable community roles, channel structure recommendations, channel welcome messages, and the bot additions required to support all of the above.

All bot changes described here extend the existing casting-call-bot.js file that is already deployed on Render.

**2. Recommended Channel Structure**

The current structure is solid. Below are the recommended channels per category, with one addition and one rename.

**Welcome & Info**

> **\#welcome-and-rules** (existing) Rules, verification gate button, and community expectations.
>
> **\#announcements** (existing) Admin-only posting. Major news, events, and server updates.
>
> **\#introductions** (existing) New members introduce themselves.
>
> **\#roles** (new) Self-assignable role picker. Members select craft and location tags here.

**Gigs & Casting**

> **\#post-a-gig** (rename from \#create-call) Home of the \'Submit a Gig\' bot button.
>
> **\#casting-calls** (existing, forum) All casting call threads posted by the bot.
>
> **\#crew-calls** (existing, forum) All crew call threads posted by the bot.

**The Quad**

> **\#general-film-talk** (existing) Open discussion about film, TV, and the craft.
>
> **\#watercooler** (existing) Off-topic conversation.
>
> **\#local-events** (existing) Oklahoma film events, screenings, workshops, festivals.

**Crew & Post**

> **\#production-crew** (existing) On-set crew talk --- logistics, departments, gear questions.
>
> **\#post-production** (existing) Editing, color grading, VFX, sound post.
>
> **\#gear-classifieds** (existing) Buy, sell, and rent equipment.

**Collaboration**

> **\#feedback-cafe** (existing) Share work and give/receive constructive feedback.
>
> **\#find-a-reader** (existing) Find script readers and dramaturgical feedback.
>
> **\#script-swap** (existing) Exchange scripts for mutual coverage.
>
> *Note: Voice channels (Base Camp, Reading Rooms) look good as-is --- no changes needed.*

**3. Member Verification Gate**

The gate works by hiding all channels from \@everyone and only revealing them once a member clicks an \'I Agree\' button in \#welcome-and-rules. The bot assigns a \'Member\' role on click, which unlocks everything else.

**Step 1 --- Create the Member Role**

1.  Server Settings \> Roles \> Create Role.

2.  Name it Member.

3.  No special permissions needed --- it exists only as an access key.

4.  Position it above \@everyone in the role list.

**Step 2 --- Configure Channel Permissions**

For every channel except \#welcome-and-rules:

5.  Open the channel \> Edit Channel \> Permissions.

6.  Add \@everyone: set \'View Channel\' to Deny.

7.  Add Member: set \'View Channel\' to Allow.

For \#welcome-and-rules itself:

8.  Leave \@everyone able to view it.

9.  Set \@everyone \'Send Messages\' to Deny so newcomers can only read and click the button.

> *Note: Announcements is often kept visible to \@everyone so people can see activity before joining. That is your call.*

**Step 3 --- Add Bot Code for Verification**

Add the following command and handler to casting-call-bot.js. The MEMBER\_ROLE\_ID environment variable must be set in Render to the role ID of your Member role (right-click the role in Server Settings \> Roles \> Copy Role ID).

> *New env var to add in Render:\
> MEMBER\_ROLE\_ID=your\_member\_role\_id\
> \
> New slash command to add to the commands array:\
> /post-verify-button --- posts the \'I Agree\' button in \#welcome-and-rules (run once)\
> \
> What the bot does when clicked:\
> 1. Checks if the user already has the Member role.\
> 2. If not, assigns it.\
> 3. Replies ephemerally: \'Welcome to the server --- you now have full access.\'*

**Step 4 --- Post the Verification Button**

10. Deploy the updated bot to Render.

11. Go to \#welcome-and-rules in Discord.

12. Type /post-verify-button --- the bot posts a pinned message with an \'I Have Read and Agree to the Rules\' button.

13. Pin that message so it stays at the top.

> *Note: The button message persists permanently. You only need to run /post-verify-button once. Do not delete the message or the button will stop working.*

**4. Self-Assignable Roles**

Members can pick their own craft and location tags in \#roles. The bot posts a persistent message with two select menus --- one for craft, one for location. Selecting a role adds it; selecting it again removes it (toggle).

**Recommended Roles to Create in Discord**

**Craft Roles**

Create each of these as a role in Server Settings \> Roles:

-   Actor

-   Director

-   Cinematographer / DP

-   Producer

-   Screenwriter

-   Editor

-   Sound

-   Production Designer

-   Grip / Electric

-   Makeup & Wardrobe

-   Student Filmmaker

**Location Roles**

-   OKC Area

-   Tulsa Area

-   Rest of Oklahoma

-   Out of State

**Notification Roles (optional)**

Members who want to be pinged when new gigs are posted:

-   Casting Call Alerts

-   Crew Call Alerts

> *Note: Give none of these roles any special permissions. They are informational labels only.*

**Bot Command to Post the Role Picker**

Add /post-roles-button to the bot. When run in \#roles, it posts a message with two select menus: Craft Role and Location. Run it once after deploying. The menus are persistent --- members can update their roles any time by coming back to \#roles and reselecting.

**5. Bot Additions Summary**

The following additions need to be made to casting-call-bot.js:

**New Environment Variables (add to Render)**

-   MEMBER\_ROLE\_ID --- ID of the Member role

-   ACTOR\_ROLE\_ID, DIRECTOR\_ROLE\_ID, etc. --- one per self-assignable role

> *Note: The simplest approach is to store all role IDs as a JSON map in a single ROLE\_MAP env var rather than one variable per role. Ask Claude to implement whichever you prefer.*

**New Slash Commands**

-   /post-verify-button --- posts the I Agree button in the current channel (run once in \#welcome-and-rules)

-   /post-roles-button --- posts the role picker menus in the current channel (run once in \#roles)

**New Interaction Handlers**

-   Verify button click: assign Member role, ephemeral confirmation

-   Craft role select menu: toggle selected role on/off, ephemeral confirmation

-   Location role select menu: remove any existing location role, add selected one, ephemeral confirmation

**6. Channel Welcome Messages**

Set each of these as the channel topic (Edit Channel \> Topic) or post them as a pinned message. They are written to be copied and pasted directly.

**\#welcome-and-rules**

> *Welcome to Oklahoma Filmmakers & Actors. Before you can access the rest of the server, please read the rules below and click the \'I Agree\' button at the bottom of this channel. This is a community built on mutual respect, honest collaboration, and a shared love of the craft. We are glad you are here.*

**\#announcements**

> *Server-wide announcements from the moderation team. This channel is read-only. Expect posts about events, policy changes, and major community news.*

**\#introductions**

> *Tell us who you are. Share your name, where in Oklahoma you are based, what you do, and what you are currently working on. There are no wrong answers --- students, hobbyists, and working professionals are all welcome here.*

**\#roles**

> *Pick your roles using the menus below. Your craft and location tags help other members find collaborators and give everyone a sense of who is in the room. You can update your selections any time.*

**\#post-a-gig**

> *Use the button below to post a casting call or crew call. Your submission will be automatically formatted and posted to the appropriate forum channel. Please only post legitimate, good-faith opportunities.*

**\#casting-calls**

> *Casting calls posted by Oklahoma filmmakers and productions. Browse open roles, follow threads that interest you, and reach out directly through the submission instructions in each post.*

**\#crew-calls**

> *Crew calls for Oklahoma productions. If you are looking for work or a collaborator, this is the place. Check each post for compensation details and how to apply.*

**\#general-film-talk**

> *The main space for film conversation --- craft, industry news, recommendations, questions, and everything in between. Keep it constructive and on topic.*

**\#watercooler**

> *Off-topic. Talk about whatever is on your mind. The only rule here is the same as everywhere else: be decent to each other.*

**\#local-events**

> *Oklahoma film events --- screenings, festivals, workshops, networking nights, and open calls. If you know about something worth attending, post it here.*

**\#production-crew**

> *On-set talk for crew. Department questions, logistics, gear recommendations, call sheet culture, and production problem-solving. Share what you know.*

**\#post-production**

> *Editing, color, sound, and VFX. A space for post professionals and learners to share techniques, troubleshoot, and talk workflow.*

**\#gear-classifieds**

> *Buy, sell, and rent film equipment. Always include price, condition, and location in your post. All transactions are between members --- the server takes no responsibility for deals made here.*

**\#feedback-cafe**

> *Share your work and get constructive feedback. When posting, let people know what stage you are at and what kind of feedback you are looking for. When giving feedback, be specific and kind.*

**\#find-a-reader**

> *Looking for someone to read your script? Post here with genre, page count, and what kind of notes you want. Offering to read? Let people know your availability and strengths.*

**\#script-swap**

> *Exchange scripts for mutual coverage. Post your logline and page count, and indicate whether you are looking for a swap partner or just a reader.*

**7. Setup Checklist**

Work through these in order.

**In Discord --- Roles**

-   Create the Member role

-   Create all Craft roles (Actor, Director, Cinematographer/DP, etc.)

-   Create all Location roles (OKC Area, Tulsa Area, etc.)

-   Create Notification roles if desired (Casting Call Alerts, Crew Call Alerts)

-   Copy all role IDs for use as env vars

**In Discord --- Channels & Permissions**

-   Rename \#create-call to \#post-a-gig

-   Create \#roles channel in the Welcome & Info category

-   Set \@everyone permissions: deny View Channel on all channels except \#welcome-and-rules

-   Set Member role permissions: allow View Channel on all channels

-   Set \@everyone Send Messages to Deny in \#welcome-and-rules

-   Add welcome messages or topics to each channel

**In Render --- Environment Variables**

-   Add MEMBER\_ROLE\_ID

-   Add role IDs for all self-assignable roles

-   Verify CASTING\_FORUM\_CHANNEL\_ID and CREW\_FORUM\_CHANNEL\_ID are set

**In the Bot --- Code & Deployment**

-   Add /post-verify-button command and handler

-   Add /post-roles-button command and handler with role select menus

-   Push to GitHub and confirm Render redeploys successfully

-   In \#welcome-and-rules: run /post-verify-button, pin the resulting message

-   In \#roles: run /post-roles-button, pin the resulting message

-   In \#post-a-gig: run /post-gig-button, pin the resulting message

-   Test the full flow: new member account, agree to rules, select roles, post a gig
