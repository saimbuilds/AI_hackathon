# Fold: strategy memo (YC lens)

> **One-liner:** Fold is the 6-minute morning paper for people who've given up on the news.
> It's written for you, you finish it in one sitting, and you still remember it tomorrow.

---

## 1. The insight (our "secret")

Everyone in this hackathon will read the brief as an **access** problem ("news is scattered, aggregate it").
The data says the real problem is **exhaustion and forgetting**:

- **4 in 10 people** across 48 countries say they sometimes or often **avoid the news**, up from 29% in 2017 (Reuters Institute Digital News Report 2025).
- Among avoiders, **39% say it hurts their mood** and **31% feel worn out by the sheer amount** of news.
- The brief itself ends with: *"…and still can't name three things they learned."*

Many people don't need more news. They need **less, finished, and remembered.** An infinite feed is the cause of the problem, not the cure.
Instagram's founders proved this the hard way: **Artifact**, their "TikTok for news", shut down in 2024.

**So our bet is the ritual, not the feed.** A paper that is short, personal, *ends*, tells you what each story means *for you*, and quizzes you the next morning.

---

## 2. Who it's for (ICP)

| | Who | Pain | Why they pay / spread it |
|---|---|---|---|
| **Primary user** | The *guilty avoider*: 20–35, busy, knows they should keep up, gets news by accident from reels and WhatsApp forwards | Overwhelm, guilt, "I read stuff but remember nothing" | Free daily habit → Fold+ for audio, more beats, Sunday edition |
| **Primary payer (wedge)** | The *adult child*, buying a paper **for their parents** in their language: Urdu, Hindi, Arabic, Spanish, Tagalog… Diaspora families are the sharpest case (you in London, your parents in Lahore or Manila) | Parents live in WhatsApp-forward misinformation, prefer paper and big type, often a language other than English | Gifting has higher willingness to pay than buying for yourself. Every gift = 2 users |
| **Plus upgrade** | The *newsletter-drowned professional* who subscribes to 20+ newsletters and reads none | Inbox guilt, scattered sources (the brief literally names "newsletters") | "Your newsletters + the news, in one paper" is the clearest paid feature |
| **Expansion** | Teams: founders, analysts, sales, policy, comms | Need a daily industry/competitor brief | B2B seats, highest contract value |

**Global from day one; local depth is a feature, not a boundary.**
- The product is for everyone: any city (global weather API, Google News editions per country), any paper language (AI translation per edition), a worldwide source catalog by region (Kagi Kite).
- Big players are thin outside a few markets. Apple News, for example, only runs in the US, UK, Canada and Australia. So "local depth everywhere" is a real edge.
- We **seed** growth where we have unfair access: this hackathon, universities, South Asian diaspora networks, tech LinkedIn/X. These are starting points, not limits.
- **The real incumbent in most of the world is the family WhatsApp group.**

---

## 3. Why now

1. **Editing became nearly free.** A human editor per reader was impossible; an LLM edition costs about a quarter of a cent (see LAUNCH.md §3).
2. **Social platforms abandoned news.** Meta pulled news in Canada and wound down the Facebook News tab. "Instagram has one feed, news has nothing like it" is true because Meta walked away.
3. **Publishers are losing search traffic** to AI answers. They need new distribution, and Fold *sends clicks out*.
4. **Big tech is validating the category right now.**
   - OpenAI launched **ChatGPT Pulse** (daily personalized cards) in Sept 2025, Pro-only ($200/mo) at launch.
   - **Huxe** (ex-NotebookLM team, audio briefings) just struck an AI-audio licensing deal with **Apple** (reported 11 Oct 2026).
   - **Particle** raised ~$15M for AI news.
   - The category is hot and nobody owns the *ritual*.

---

## 4. Competition: honest

| Player | What it is | Why it doesn't win *our* user |
|---|---|---|
| ChatGPT Pulse | 5–10 cards each morning, inside a chat app, driven by your chats | Not a paper, no ending, no recall, no print, no local depth. **Distribution is the real threat** |
| Google Discover / Daily Listen | Infinite ad-funded feed / audio overview | Optimized for engagement; a product that *ends* conflicts with their business model |
| Apple News | Curated app + paid tier | Not available in Pakistan |
| Particle | AI multi-source story summaries, feed format | US-centric, feed, no recall/ritual |
| Ground News | Bias comparison | Built for news junkies, not avoiders |
| Huxe | Audio briefings from email/calendar + topics | Audio-only, US, now tied to Apple |
| Inshorts | 60-word cards, ad-funded | Infinite, shallow, no personalization depth |
| Newsletters (Morning Brew etc.) | Same email for everyone | Not personal |
| **Family WhatsApp group** | Where millions actually get "news" | Unverified, no sources. **Fold becomes the trusted thing to forward** |

**"Why won't OpenAI or Google just do this?"** They will do *briefings*. Their business models reward time spent, and ours rewards *finishing*. They won't build Urdu large-print papers for retired fathers in Rawalpindi. Our edge is speed, a niche they ignore, and owning a daily ritual. If we win the ritual, we are the acquisition (Huxe → Apple shows the exit path).

---

## 5. Honest teardown: what the other 99 teams will build, and our fix

### The 90 typical teams
| What they'll do | The flaw | Our fix |
|---|---|---|
| Topic checkboxes | 3 checkboxes ≠ a person | One sentence + 12 adaptive swipes + "who's this for?" |
| NewsAPI only | One source, delayed, the same for everyone | ~150 feeds + Google News per interest + Pakistani outlets, clustered into stories |
| One card per article + GPT summary | Five cards about the same event; summaries are a commodity | **Stories** with "Confirmed by 6 outlets", plus a **"For you" line**: what it means for *you* |
| Like button = category counter | Invisible, unprovable | Rocchio vectors + topic bandit + "why this story" + **Learning Lab proof** |
| Screenshot-to-PDF | Not a newspaper | Real typesetting, QR codes, and a **paper for your parents** |
| Infinite scroll "feed like Instagram" | The exact thing that makes people avoid news | **A paper that ends** + "Tomorrow in your paper" |
| No retention mechanics | No reason to come back tomorrow | 7 AM delivery, streak, recall quiz, Daily 3, cliffhanger |
| No business model | Judges ask "who pays?" | Gift wedge → Fold+ → Teams, with unit economics |
| Zero users | Demo is a promise | **Real users during the hackathon**, funnel numbers in the Loom |

### The dangerous 10 (strong teams) will likely do
- **NotebookLM-style two-host podcast.** Trendy, so it won't differentiate. We demote audio to a stretch goal.
- **"Multi-agent AI newsroom"** (researcher/writer/editor agents). Buzzwords. We show *evidence* instead of agent diagrams.
- **Ground News-style bias meter.** We include a lighter, more useful trust signal (source count + "what we don't know yet").
- **Chat with the news.** Everyone has it, and it breaks the finite ritual. We skip it.
- **A polished v0-style UI.** We match the polish and beat them on thesis, retention, proof and business.

**How we beat even the strong ones:** they will show *features*. We show a **thesis → ICP → retention loop → proof → business**. That is how YC partners and AI-studio founders think.

---

## 6. The standout: one spike, one wedge, one proof

1. **Spike (the sentence judges repeat):** *"A paper that ends, tells you what each story means for you, and makes sure you remember it."*
2. **Wedge (the emotional closer + business):** *"Make one for someone you love."* An **Urdu, large-print paper for Abbu**, printed or forwarded every morning, with *"Compiled for Abbu by Saim"* in the masthead. Most teams will treat the PDF as a checkbox; for us it becomes the heart of the business.
3. **Proof (what makes it credible):**
   - The **Learning Lab** shows relevance rising over 7 simulated days while variety holds.
   - **Real users** ("41 people printed their paper today; 73% finished it") with live funnel numbers.

---

## 7. The addiction engine: habit, not compulsion

Hook model (trigger → action → variable reward → investment), with every mechanic borrowed from a product that proved it:

| Stage | Mechanic | Proven by | Build cost |
|---|---|---|---|
| **Trigger** | 7:00 AM delivery: *"Edition No. 13 is on your doorstep: 11 stories · 6 min · 1 developing"* (email + installable web app) | Morning Brew, newspapers | 45 min |
| **Trigger** | **Cliffhanger:** the paper ends with *"Tomorrow in your paper: verdict expected in…"*, open loops from developing stories (Zeigarnik effect) | Netflix "next episode" | 20 min |
| **Action** | One tap → Stories mode, thumb-only, done in 6 min | Instagram Stories | in core |
| **Variable reward: hunt** | Lead-story surprise, **Off Your Beat** wildcard, "For you" insights | Slot-machine variability, the good kind | in core |
| **Variable reward: self** | **"All caught up"** closure → 3 things → recall score | Inbox Zero, Duolingo lesson-complete | 30 min |
| **Variable reward: tribe** | **The Daily 3:** the *same* 3 questions for everyone on the shared front page → a **Wordle-style share grid** to WhatsApp: `Fold #13 · 🧠 3/3 · 🔥 9-day streak` | Wordle (daily, finite, spoiler-free sharing) | 45 min |
| **Investment** | Name your paper, swipes train it, follow developing stories; the **edition number** grows on the masthead ("Vol. I, No. 50") | IKEA effect, Duolingo identity | in core |
| **Investment** | **Streak with a freeze**, Sunday "week in review", monthly **Fold Wrapped** share card | Duolingo, Spotify Wrapped | 30 min (+ Wrapped stretch) |
| **Investment** | **Gift papers:** you curate for family and see their streak | Storyworth, Skylight frames | 1.5 h |

**The ethical line (say it in the pitch):**
- One notification a day. No infinite scroll.
- **Calm mode** hides graphic and violent stories and frames hard news constructively.
- The north-star metrics are **Finished Editions per week** and **Recall rate**, not time-on-site.
- "We'd rather you spend 6 minutes and remember than 60 and forget." This turns "addictive" from a red flag into a selling point.

---

## 8. What was missing from plan v1, and what we add

| Missing | Add | Priority |
|---|---|---|
| AI only *summarized* (a commodity) | **"For you" line** per story: implication for your role, city and goals ("Rate cut → cheaper car financing in Islamabad", "New SECP rule → affects your fintech side-project"). Grounded only; omitted when there's no real link; no financial advice | **MUST**, 30 min, prompt + profile fields |
| No trigger to come back | **7 AM email** (Resend free tier) via the GitHub Actions daily job + installable web app | **MUST** |
| Quiz was private | **Daily 3** shared quiz + Wordle-style share grid + **WhatsApp share** (`wa.me` link, free) of "3 things I learned, with sources" | **MUST** |
| No trust signal | **"Confirmed by N outlets" / "Single source"** badges and a "What we don't know yet" line for developing stories | **MUST**, 20 min, comes from clustering |
| No cliffhanger | **"Tomorrow in your paper"** box + streak | **MUST** |
| No growth loop or payer | **Gift a paper:** onboarding for someone else, large print, **Urdu** (Noto Nastaliq, right-to-left), delivered by email or a WhatsApp-forward link | **SHOULD**, 1.5 h; large-print English is the fallback |
| Nothing for the 40% who find news upsetting | **Calm mode** (enrichment rates each story's "distress" level; filter + reframe) | **SHOULD**, 20 min |
| Zero users | **Ship to real people at H7.5**: hackathon group, friends, family WhatsApp, a LinkedIn post, a QR code on your laptop. PostHog free tier for the funnel. One-question feedback at the end of the paper | **MUST** |
| No business surface | **Pricing page** with a "fake door" for Fold+ (we measure clicks) + **Teams waitlist** | **SHOULD**, 20 min |

**Demoted:** audio edition (stretch; strong teams will do podcasts anyway), chat (cut), Newsroom ops page (minimal), Reader DNA (simplify to why-this + editable memo).

---

## 9. Business model

### Pricing
| Tier | Price | What |
|---|---|---|
| **Free** | $0 | Daily paper (10 stories), PDF, archive, streak, Daily 3 |
| **Fold+** | $4/mo (Pakistan: PKR 399/mo) | Audio edition, unlimited beats & followed stories, Sunday long-read, Calm mode presets, Wrapped |
| **Fold Gift** | $5/mo or $49/yr per recipient | A paper for someone else: large print, Urdu, daily email/WhatsApp, giver dashboard. Physical weekly print mail-out later |
| **Fold for Teams** | $8/seat/mo | Team brief on competitors/industry/regulation, Slack delivery, shared Daily 3 |

### Revenue later (don't pitch as the core)
- **Personalized classifieds:** jobs, events and scholarships matched by the same interest vectors. Ads without tracking, which is the newspaper's original business model done right.
- **Publisher partnerships:** we send clicks; revenue share on subscriptions we refer.

### Unit economics (full model in [LAUNCH.md](LAUNCH.md) §3–4)
- Expensive AI work happens **once per story**, shared by all readers (~$20–200/month total, flat).
- Per reader: 1 editor call per day (~4K in, ~1K out) at current Flash-Lite-class prices ($0.25/$1.50 per M) ≈ **$0.0025 per edition**.
- All-in (AI, email, PDF, storage, analytics): **≈ $0.10–0.15 per active reader per month at launch → ≈ $0.05 at scale** (batch + prompt caching + SES + distilled model).
- A free reader costs ~10–15¢/month. At 4% paying $4, each reader brings ~16¢/month. **Free users pay for themselves.** Gross margin ≈ 80–90%.
- During the hackathon it all runs on free tiers.

### What a $10M ARR business looks like (illustrative targets, not market data)
| Line | Assumption | ARR |
|---|---|---|
| Fold+ | 150k paying × $36/yr (~4% of ~3.75M MAU) | $5.4M |
| Gift | 50k recipients × $49/yr | $2.45M |
| Teams | 2,000 teams × 10 seats × $96/yr | $1.9M |
| **Total** | | **≈ $9.8M** |

### Moat (honest)
It's weak on day 1, as it is for every consumer app. It compounds through:
1. **Behavioral taste and knowledge data:** what each reader *knows* (recall), not just what they clicked.
2. **Habit + archive switching cost:** your streak, your 200 editions.
3. **Gift network:** every gift adds a second user.
4. **Local depth:** language, sources and culture that the giants deprioritize.

---

## 10. YC-style hard questions: our answers

| They ask | We answer |
|---|---|
| "News apps have terrible retention." | Because they're feeds. We're a finite ritual with a trigger, a cliffhanger and a streak. And we measure *finishing*, not opens |
| "Why won't ChatGPT do this?" | They'll do briefings inside a chat app; we own the paper, the ritual, the gift and the local market. Their model rewards time spent; ours rewards finishing |
| "Publishers will hate you." | We never republish full text. We summarize across outlets, attribute every source, and send traffic out. A partner program comes next |
| "Hallucinations?" | Briefs are grounded in multiple sources with links; the editor model may only select and frame, never change facts; single-source stories are labelled |
| "Filter bubble?" | Off Your Beat (exploration), a shared front page everyone gets, and a diversity floor proven in the Learning Lab |
| "Who pays?" | Adult children gifting to parents first (highest willingness to pay), then Fold+, then Teams |
| "Do people want this?" | Show the real hackathon-day numbers and quotes |

---

## 11. Metrics to instrument today (PostHog, free tier)
Landing → onboarding start → onboarding finish → first edition opened → **edition finished** → PDF downloaded → Daily 3 played → **shared** → gift created → Fold+ fake-door click → email opt-in.

Show the funnel in the Loom. Real numbers, however small, beat every other team's zero.

---

## 12. The 60-second pitch
> "Quick question: name three things you learned from the news yesterday.
> Four in ten people now avoid the news, not because they don't care, but because it's endless, exhausting and forgettable. Infinite feeds made it worse; Instagram's founders built 'TikTok for news' and shut it down.
> Fold is the opposite. In 90 seconds it learns who you are, then every morning it prints *your* paper: about 10 stories, each confirmed across outlets, each with a line on what it means for *you*. It **ends**. It quizzes you the next morning. And it gets better every time you swipe. We proved that with simulated readers, and since this afternoon, with real ones.
> And because it's a real paper, you can make one for someone you love. This is my father's, in Urdu, large print, on his doorstep at 7.
> Gifts are our wedge, Fold+ and Teams are the business, and each edition costs a fraction of a cent to make."

---

## 13. Personalized news keeps failing. Why would we win?

### What actually died, and why
| Product | What happened | The real lesson |
|---|---|---|
| **Artifact** (Instagram founders, 2023–24) | Shut down; the founders said the market opportunity wasn't big enough to justify continued investment | A big team building a standalone news *app* needs a giant market. Personalization tech alone isn't a business |
| **Prismatic, Zite, News360** (2010s) | Machine-learning personalized news readers; closed or absorbed | "Better recommendations" isn't a reason to change habits |
| **Summly → Yahoo News Digest, Circa** | Summaries/atomized news; acquired, then shut | **Summarization is a feature, not a company**, and today every LLM does it free |
| **Nuzzel, Facebook Paper, Google Reader** | Shut by their parent platforms | Platform risk: if you live inside someone else's product, they can switch you off |

### What actually won
| Winner | Why it worked |
|---|---|
| **Newsletters** (Morning Brew, Axios, TLDR, Substack) | Delivered **into a channel people already open** (email), **finite**, a clear voice, paid by sponsors or subscribers |
| **NYT Games** (bought Wordle in 2022) | **Games create the daily habit; the news rides along.** A daily, finite, shareable ritual |
| **Duolingo** | Turned an intangible "should" into a tangible, streak-driven habit |
| **Feedly** | Survived the consumer RSS collapse by selling intelligence to businesses |
| **Ground News** | A niche that pays (bias-aware readers), subscription-funded |

### The pattern, and how Fold maps onto it
| Failure root cause | Fold's fix |
|---|---|
| A new app icon with no trigger: news is a "should" | **Delivered where people already are:** 7 AM email, WhatsApp, print. The web app is the depth, not the habit |
| Ad model → engagement optimization → outrage → avoidance | **Subscription + gifts.** We're paid when you *finish*, not when you scroll |
| Summarization as the product | Summaries are table stakes. The product is **the ritual** (finite + recall + Daily 3) and **"For you"** meaning |
| Value is invisible ("am I better informed?") | **Make it tangible:** recall score, "3 things", streak, "you've followed this story for 9 days" |
| Content is a commodity + publisher conflict | We're a **format and an editor**, and we add **your own sources** (newsletters, creators). We send traffic out; publisher revenue share comes later |
| Personalization goes stale / filter bubble | Off Your Beat exploration + a shared front page + an editable memo |
| Cost structure needs a giant market | AI editing at fractions of a cent + a tiny team = **profitable at a few thousand paying users**. We don't need to beat Google to be a great business |
| No distribution vs. OS-level giants | **Loops the giants don't build:** gifts (2 users each), the masthead share card, the Daily 3 grid, communities/teams (B2B2C) |

**The honest one-liner for judges:** *"Personalized news apps failed because they were feeds that summarized. Newsletters and Wordle won because they were finite rituals delivered where you already are. Fold is the first to combine personalization with the ritual, and AI makes it cheap enough to be profitable from the start."*

---

## 14. The bigger picture

**Every morning, billions of people decide what to pay attention to, and feeds built to sell ads make that decision for them. Fold is the personal editor that works for you instead.**

The paper is the wedge. The company is **the editor for your whole information life**:

| Phase | What Fold becomes | Who pays |
|---|---|---|
| 1. **The paper** (now) | Your daily news, finished and remembered | Free → Fold+ |
| 2. **Your sources** | Newsletters (personal inbound address), YouTube, podcasts, Reddit, blogs: *one paper instead of 30 subscriptions* | Fold+ |
| 3. **Your people** | Gift papers, family pages ("talk about this at dinner"), communities, clubs, universities, teams | Gift, Teams, B2B2C |
| 4. **Your knowledge** | A memory of everything you've read: story timelines, recall, "what do I know about X?" Then exam prep and professional upskilling | Fold+, education partners |
| 5. **The network** | Creators and publishers distribute *into* millions of personal papers and get paid by reads (a Spotify-style pool). This fixes the aggregator-vs-publisher fight by paying them | Revenue share, sponsorships matched by interest (no tracking) |

The moat compounds along the way. We learn what each person **cares about** (reading behavior) and what each person **knows** (recall). No feed has the second.

---

## 15. Pre-mortem and kill criteria (YC loves this)

**How Fold could die, and the early signal for each:**
1. **People sign up but don't come back.** Signal: fewer than 25% of new users finish an edition in their second week. → Double down on triggers (email, WhatsApp) and test the Teams wedge.
2. **A public factual error damages trust.** → Multi-source grounding, single-source labels, report-a-problem, the editor may never change facts.
3. **OpenAI makes Pulse free worldwide, with email.** → Our differentiation must be the ritual, gifts, your own sources and local depth. Track whether users cite those as reasons they stay.
4. **Publishers block us.** → RSS-first (syndication is the point of RSS), link-out, a partner program.
5. **We chase every segment at once.** → Pick by data at day 30.

**Day-30 numbers that would mean "keep going":**
- ≥ 60% of opened editions finished
- ≥ 30% of new users still reading in week 2
- ≥ 3% of users create a gift paper or click Fold+
- At least one segment (gift / newsletters / teams) clearly out-converting the others
