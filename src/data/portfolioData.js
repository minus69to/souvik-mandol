/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO CONTENT  —  the ONLY file you need to edit to update your info.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything on the site (text, links, projects, research, skills…) is read
 *  from this file. Design / 3D code lives elsewhere and never needs touching.
 *
 *  Quick rules:
 *   • Images go in /public and are referenced by file name only ("profile.jpg").
 *   • Links are plain URLs. Leave a URL as "" to hide its button.
 *   • `scene` picks the 3D glyph shown for a project / research item.
 *     Available glyphs are listed in SCENES at the bottom of this file.
 *   • Markdown-style links [label](https://url) work inside `about.extras`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const portfolioData = {
  personal: {
    firstName: "Souvik",
    lastName: "Mandol",
    role: "Junior Engineer (CSE) · BRTC, BUET",
    tagline: "Software Engineer · ML Researcher",
    email: "souvikmt99@gmail.com",
    phone: "+880 1880-701243",
    location: "Dhaka, Bangladesh",
    github: "github.com/minus69to",
    githubUrl: "https://github.com/minus69to",
    linkedin: "linkedin.com/in/souvikmandol",
    linkedinUrl: "https://linkedin.com/in/souvikmandol",
    instagramUrl: "https://www.instagram.com/insomniyuck.537",
    blogUrl: "http://insomniyuck.me/",
    resumeFile: "resume.pdf",          // file inside /public
    resumeText: "Download CV",
    photo: "profile2.jpg",             // hero photo (inside /public)
    photoSmall: "profile.jpg",         // nav / small avatar (inside /public)
    openToResearch: true,              // shows the "open to research collaborations" banner
    researchInterests: ["Machine Learning", "LLMs", "Human-Computer Interaction", "IoT & Systems Security"],
    languages: ["Bengali (Native)", "English (Fluent)"],
  },

  nav: [
    { name: "About", href: "#about" },
    { name: "Experience", href: "#experience" },
    { name: "Projects", href: "#projects" },
    { name: "Research", href: "#research" },
    { name: "Skills", href: "#skills" },
    { name: "Education", href: "#education" },
    { name: "Contact", href: "#contact" },
  ],

  landing: {
    tag: "Souvik Mandol — Dhaka, Bangladesh",
    headline: "I BUILD SYSTEMS THAT SEE, DECIDE AND ACT.",
    subheadline:
      "Software engineer at BRTC, BUET, building Dhaka's adaptive traffic signal platform: Go services, MQTT wire protocols, STM32 controllers and Jetson edge vision. BUET CSE graduate researching machine learning, LLM agents and human-computer interaction.",
    ctaText: "See the work",
    secondaryCtaText: "Research with me",
    // Small facts shown as a live ticker under the hero. Edit freely.
    ticker: [
      "Adaptive signals live at 4 Dhaka intersections, scaling to 30",
      "Published at IEOM Bangladesh 2025",
      "Two ongoing research collaborations (Japan · USA)",
      "Go · Python · TypeScript · C++",
      "Open to research collaborations",
    ],
  },

  about: {
    tag: "About",
    headline: "SO… WHAT DO I ACTUALLY DO?",
    description:
      "I'm a software engineer and a recent CSE graduate from BUET. At BRTC I build the software behind an adaptive traffic signal system for Dhaka, which means my code now has opinions about real traffic. The rest of the time I teach computers how to do useful things using code, data, and a bit of stubborn debugging. I enjoy AI, automation, and system design, mainly because solving complex problems is more fun than pretending they don't exist.",
    extrasTitle: "Beyond the terminal and the debugger:",
    extras: [
      "Mini-marathon runner aiming for a full marathon and maybe a triathlon someday.",
      "Not a foodie, more of a food hunter exploring new restaurants and cuisines.",
      "Cinephile who enjoys catching movies at Cineplex whenever possible.",
      "Beginner hobbyist photographer. Some shots live on my [Instagram](https://www.instagram.com/insomniyuck.537).",
      "Traveller who prefers hiking and hopes to reach ABC someday.",
      "New to the book-reading league but enjoying it a lot.",
      "I keep a personal memory archive at [insomniyuck.me](http://insomniyuck.me/).",
    ],
  },

  experience: {
    tag: "Experience",
    headline: "WHERE THE CODE MEETS THE STREET.",
    jobs: [
      {
        id: "brtc",
        title: "Junior Engineer (CSE)",
        company: "BRTC, Bangladesh University of Engineering and Technology",
        companyShort: "BRTC · BUET",
        companyUrl: "https://www.buet.ac.bd/",
        duration: "Aug 2026 – Present",
        location: "Dhaka",
        scene: "network",
        bullets: [
          "Government-funded project with Dhaka South City Corporation to build a locally developed adaptive traffic signal system for Dhaka; live at 4 intersections, scaling to 30.",
          "Extend and maintain the Go and React/TypeScript platform (MQTT, PostgreSQL/TimescaleDB, WebSocket) that lets operators monitor and control signals from a tablet, with Telegram notifications on every change.",
          "Built the binary MQTT protocol layer and OTA firmware updates for STM32 Nucleo signal controllers, and the adaptive-mode pipeline that turns Jetson Orin Nano edge-vision traffic data into live, safety-clamped signal plans.",
          "Set up and run the on-premise server and private fibre network (IP addressing, Docker deployment) linking STM32 controllers, Jetson Orin Nano units, IP cameras and countdown timers, secured with per-device mTLS certificates and topic-level ACLs.",
        ],
        bulletLinks: {},
        // Optional deep-dive panel (shown as an expandable "inside the platform" card)
        deepDive: {
          title: "Inside the adaptive signal platform",
          intro:
            "A real-time, safety-first IoT system that lets a city operate its intersections remotely and adapt signal timing to live demand. Operational and security details are withheld by design.",
          pillars: [
            { name: "Live operations map", text: "Signal state and health of every junction, updated in real time in the browser." },
            { name: "Remote plan editing", text: "Operators draw phase timing in a visual editor and push it to the field; the controller acknowledges every push." },
            { name: "Safe edge execution", text: "Controllers run the cycle locally and switch plans only at a safe phase boundary. A server outage never blacks out a junction." },
            { name: "Camera-driven adaptation", text: "Vehicle counts from a separate vision unit retune green times within hard minimum and maximum limits." },
            { name: "Conflict flagging", text: "Overlapping movements are flagged in the editor, in plain language, before a plan is pushed." },
            { name: "Remote OTA updates", text: "Dual-bank firmware updates with automatic rollback for the field controllers." },
          ],
          stack: [
            { layer: "Backend", tech: "Go service, REST and WebSocket" },
            { layer: "Frontend", tech: "React web console with live map" },
            { layer: "Data", tech: "PostgreSQL with time-series storage" },
            { layer: "Messaging", tech: "MQTT over TLS, binary wire protocol" },
            { layer: "Edge", tech: "STM32 firmware, Jetson Orin Nano vision" },
            { layer: "Packaging", tech: "Docker Compose on an on-premise server" },
          ],
          owned: [
            "Control-plane architecture",
            "Backend service and APIs",
            "Live operator web console",
            "Bridging two controller families",
            "Timing and pedestrian safety logic",
            "Deployment and operations",
          ],
        },
      },
      {
        id: "merilsoft",
        title: "Software Engineer",
        company: "MerilSoft LLC",
        companyShort: "MerilSoft",
        companyUrl: "https://merilsoft.com/",
        duration: "Dec 2025 – Apr 2026",
        location: "Remote · USA",
        scene: "magazine",
        bullets: [
          "Built Magazine Works, an AI-powered magazine generation platform, with Next.js, PostgreSQL, AWS and Google Vertex AI.",
          "Implemented file-handling systems on AWS and integrated AI features through Google Vertex AI Studio.",
          "Worked on a restaurant system that integrates online delivery platforms such as Uber Eats and DoorDash with a POS solution.",
        ],
        bulletLinks: {
          "Magazine Works": "https://magazineworks.com/",
          "restaurant system": "https://restaurant.merilsoft.com/",
                  },
      },
    ],
  },

  projects: {
    tag: "Projects",
    headline: "THINGS I'VE SHIPPED.",
    items: [
      {
        id: "researchq",
        title: "ResearchQ",
        subtitle: "AI-assisted systematic literature review",
        description:
          "A self-hosted tool our team built to speed up systematic literature reviews. It searches the OpenAlex graph with six strategies, screens papers with Gemini (confidence scores plus manual override), extracts metadata and prepares review outputs across 18 methodologies such as PRISMA, Cochrane and Kitchenham. Alpha v0.1.0 is archived on Zenodo; a JOSS submission is in preparation.",
        tags: ["SvelteKit", "TypeScript", "Drizzle ORM", "PostgreSQL", "Google Gemini", "OpenAlex"],
        featured: true,
        scene: "papers",
        codeUrl: "https://github.com/ErenDexter/ResearchQ",
        demoUrl: "",
      },
      {
        id: "cineread",
        title: "CineRead",
        subtitle: "Cross-media AI recommendation agent",
        description:
          "A chat agent that recommends movies, series and books together, in English or Bengali. A LangGraph pipeline works out what the user is asking for, searches TMDB, Open Library and a ChromaDB index of about 940 titles in parallel, links related titles across media and streams ranked answers over SSE. Accounts, saved lists and taste profiles sit in PostgreSQL behind JWT auth.",
        tags: ["Python", "FastAPI", "LangGraph", "ChromaDB", "PostgreSQL", "SvelteKit"],
        featured: true,
        scene: "media",
        codeUrl: "https://github.com/minus69to/cineread",
        demoUrl: "",
      },
      {
        id: "sidechannel",
        title: "Side-Channel Attack",
        subtitle: "Website fingerprinting from CPU cache timing",
        description:
          "Showed that a website can be identified from CPU cache timing alone, without looking at any network traffic. Collected timing traces with a Selenium-driven browser pipeline and trained two 1D CNNs in PyTorch to classify them.",
        tags: ["Python", "Flask", "PyTorch", "Selenium"],
        featured: false,
        scene: "cache",
        codeUrl: "https://github.com/minus69to/Side-Channel-Attack",
        demoUrl: "",
      },
      {
        id: "gradpilot",
        title: "GradPilot",
        subtitle: "AI platform for graduate school applications",
        description:
          "Helps Bangladeshi students plan graduate school applications: university suggestions, verified mentors, Gemini-based feedback on Statements of Purpose, scholarship listings and a discussion forum. Built as Spring Boot and React microservices.",
        tags: ["Next.js", "React", "Spring Boot", "PostgreSQL", "Google Gemini", "Microservices"],
        featured: false,
        scene: "gradcap",
        codeUrl: "https://github.com/Navid-089/GradPilot",
        demoUrl: "https://youtu.be/fFfxtCi2y0I",
      },
      {
        id: "collaborator",
        title: "Collaborator",
        subtitle: "Real-time video meeting platform",
        description:
          "A video meeting app with teams, chat, file sharing, recording, and automatic transcripts and summaries. Video runs on 100ms; Supabase handles sign-in, real-time messaging and storage.",
        tags: ["Next.js", "TypeScript", "Supabase", "100ms"],
        featured: false,
        scene: "meeting",
        codeUrl: "https://github.com/minus69to/Collaborator",
        demoUrl: "https://collaborator-blue.vercel.app/",
      },
      {
        id: "insomniyuck",
        title: "Insomniyuck",
        subtitle: "Personal memory archive",
        description:
          "A personal memory archive built with SvelteKit and mdsvex for Markdown authoring. Eight categorized sections spanning food, travel, running, books, movies and reflections, with media served via Cloudflare R2 and an anonymous messaging integration.",
        tags: ["SvelteKit", "TypeScript", "Cloudflare R2", "Vercel"],
        featured: false,
        scene: "shelf",
        codeUrl: "https://github.com/minus69to/Personal-Blog",
        demoUrl: "http://insomniyuck.me/",
      },
      {
        id: "artgallery",
        title: "Art Gallery Management",
        subtitle: "Database project",
        description:
          "Art gallery management system built on Oracle and SQL with a React, Node.js and Express.js front end, handling artwork inventory, sales and transactions, plus a review system where users rate and comment on artworks.",
        tags: ["React", "Node.js", "Express.js", "Oracle", "SQL"],
        featured: false,
        scene: "frames",
        codeUrl: "https://github.com/minus69to/CSE-216-Project",
        demoUrl: "",
      },
      {
        id: "moviedb",
        title: "Movie Database",
        subtitle: "JavaFX term project",
        description:
          "A movie database that provides detailed information about movies. Users search, view and manage movie details through a JavaFX interface.",
        tags: ["Java", "JavaFX"],
        featured: false,
        scene: "reel",
        codeUrl: "https://github.com/minus69to/L1-T2-Project",
        demoUrl: "",
      },
    ],
  },

  research: {
    tag: "Research",
    headline: "QUESTIONS I'M WORKING ON.",
    collabTitle: "Open to research collaborations",
    collabText:
      "If you work on LLM agents, trustworthy ML, HCI, or security for IoT and cyber-physical systems, I'd love to hear from you. Remote collaborations across time zones are very welcome.",
    items: [
      {
        id: "memory",
        status: "Ongoing · 2026 – Present",
        kind: "Collaboration",
        title: "Memory Poisoning Defences for LLM Agents",
        with: "In collaboration with Istiaque Ahmed, Graduate Researcher, Osaka Metropolitan University, Japan",
        description:
          "LLM agents with long-term memory can be misled when someone with access to the user's account plants a false fact over several conversations. We are testing a trust-scoring defence that checks how independently a stored fact is backed up, and comparing it with simpler baselines on several LLMs and a widely used agent-memory library, under a preregistered protocol.",
        tags: ["LLM Agents", "AI Security", "Agent Memory", "Trust Scoring"],
        scene: "memory",
        paperUrl: "",
      },
      {
        id: "bias",
        status: "Ongoing · 2026 – Present",
        kind: "Collaboration",
        title: "Political Bias in LLM-Generated Bengali News Content",
        with: "In collaboration with Dr. Sharifa Sultana, Assistant Professor, University of Illinois Urbana-Champaign, USA",
        description:
          "Looking at whether LLMs shift the political slant of Bengali news when they summarise or rewrite it, a language where this has barely been studied. Helping build a corpus from several Bengali news outlets, annotate it with LLM support, and run human evaluations of model outputs.",
        tags: ["LLMs", "NLP", "HCI", "Bengali", "Human Evaluation"],
        scene: "bias",
        paperUrl: "",
      },
      {
        id: "gait",
        status: "B.Sc. Thesis · 2026",
        kind: "Thesis",
        title: "Age-Aware Neurological Gait Pattern Discovery from Biomechanical Signals: Multi-Phase Stroke Severity Analysis",
        with: "Dept. of CSE, BUET · Supervisor: Prof. Mahmuda Naznin · Joint work with Tusher Bhomik",
        description:
          "Stroke changes how people walk, but so do age and walking speed, which makes the effect of the neurological damage itself hard to isolate. Working with a public gait dataset of healthy adults and chronic stroke survivors (kinematic, kinetic and EMG features), we built a multi-phase pipeline that keeps these factors apart: a model of normal ageing to normalise each patient's gait, careful class balancing, and leakage-free nested cross-validation. Removing the age effect noticeably improved classification, and the analysis separated gait markers that mostly reflect walking speed from those that point to the stroke.",
        tags: ["Machine Learning", "Signal Processing", "XGBoost", "NMF", "Statistical ML"],
        scene: "gait",
        paperUrl: "",
      },
      {
        id: "elr",
        status: "Published · IEOM Bangladesh 2025",
        kind: "Publication",
        title: "Multi-Model Machine Learning Analysis of Ecological Load Ratio Using Classification, Regression, and Clustering Approaches in EU Countries",
        with: "Anik Debnath, Akash Sikdar Sudip, Souvik Mandol · Proc. 8th IEOM Bangladesh International Conference on Industrial Engineering and Operations Management, Dhaka, Dec 2025 · DOI: 10.46254/BA08.20250232",
        description:
          "Looked at which national indicators best explain ecological pressure across EU countries, using the Ecological Load Ratio as the target. Compared several tree-based classifiers and regressors, cut a large indicator set down to a handful of key features with PSO and a genetic algorithm, tuned the models with Optuna and checked them with stratified cross-validation. Clustering then grouped countries with similar ecological profiles.",
        tags: ["Scikit-learn", "XGBoost", "LightGBM", "Optuna", "PSO", "Clustering"],
        scene: "cluster",
        paperUrl: "https://ieomsociety.org/proceedings/bangladesh2025/232.pdf",
        doiUrl: "https://doi.org/10.46254/BA08.20250232",
      },
    ],
  },

  skills: {
    tag: "Technical Skills",
    headline: "THE TOOLBOX.",
    categories: [
      { name: "Languages", items: ["Python", "Go", "C++", "TypeScript", "JavaScript", "SQL", "C", "Java", "HTML", "CSS"] },
      { name: "Data Science & ML", items: ["PyTorch", "TensorFlow", "Scikit-learn", "XGBoost", "Transformers", "LangGraph", "LoRA Fine-tuning", "NumPy", "Pandas"] },
      { name: "Backend & Systems", items: ["Go", "REST APIs", "WebSocket", "MQTT (Mosquitto)", "Binary Wire Protocols", "mTLS / PKI", "Docker", "Linux", "Tailscale", "Private Fibre Network & IP Addressing"] },
      { name: "Embedded & Edge", items: ["STM32 Nucleo (host-side integration)", "Jetson Orin Nano (host-side integration)", "ROS", "Arduino UNO", "ATmega32"] },
      { name: "Web", items: ["React", "Next.js", "SvelteKit", "Node.js", "Express.js", "Spring Boot", "Laravel"] },
      { name: "Cloud & DevOps", items: ["AWS", "Google Cloud (Vertex AI)", "Azure", "Docker Compose", "GitHub Actions", "Vercel", "Cloudflare R2", "Git", "Apache JMeter"] },
      { name: "Databases", items: ["PostgreSQL", "TimescaleDB", "Oracle", "Supabase", "Appwrite"] },
    ],
  },

  education: {
    tag: "Education",
    headline: "WHERE I LEARNED TO LEARN.",
    items: [
      {
        id: 1,
        degree: "B.Sc. in Computer Science and Engineering",
        institution: "Bangladesh University of Engineering and Technology (BUET)",
        duration: "2022 – 2026",
        details: "CGPA: 3.31 / 4.00",
      },
      { id: 2, degree: "Higher Secondary Certificate", institution: "Dhaka Residential Model College", duration: "2018 – 2019", details: "" },
      { id: 3, degree: "Secondary School Certificate", institution: "Bagerhat Government High School", duration: "2013 – 2017", details: "" },
    ],
  },

  certifications: {
    tag: "Certifications",
    groups: [
      {
        provider: "Coursera (DeepLearning.AI)",
        items: [
          { name: "Neural Networks and Deep Learning", url: "https://www.coursera.org/account/accomplishments/verify/ET11XZO6D7R4" },
          { name: "Improving Deep Neural Networks: Hyperparameter Tuning, Regularization and Optimization", url: "https://www.coursera.org/account/accomplishments/verify/G4U2V4TZ6NGO" },
          { name: "Structuring Machine Learning Projects", url: "https://www.coursera.org/account/accomplishments/verify/QDXMV8P6IVSI" },
        ],
      },
      {
        provider: "Kaggle",
        items: [
          { name: "Intro to Machine Learning", url: "https://www.kaggle.com/learn/certification/souvikmandol/intro-to-machine-learning" },
          { name: "Intermediate Machine Learning", url: "https://www.kaggle.com/learn/certification/souvikmandol/intermediate-machine-learning" },
          { name: "Pandas", url: "https://www.kaggle.com/learn/certification/souvikmandol/pandas" },
        ],
      },
    ],
  },

  contact: {
    tag: "Contact",
    headline: "LET'S BUILD SOMETHING GREAT.",
    text: "Email is the fastest way to reach me. For research collaborations, a short note about the problem you're working on is more than enough.",
  },
};

/**
 * 3D glyphs you can assign to `scene` fields above.
 *  intersection  – adaptive traffic intersection (hero)
 *  network       – server / fibre / controller topology (BRTC)
 *  magazine      – stack of generated magazine pages
 *  papers        – literature graph (ResearchQ)
 *  media         – linked film / book / series (CineRead)
 *  cache         – CPU cache timing ribbon (side-channel)
 *  gradcap       – graduation cap & flight path (GradPilot)
 *  meeting       – grid of video tiles (Collaborator)
 *  shelf         – memory shelf (Insomniyuck)
 *  frames        – gallery frames (Art Gallery)
 *  reel          – film reel (Movie DB)
 *  memory        – agent memory blocks & trust scores
 *  bias          – balance of news sheets
 *  gait          – walking stick figure from gait cycle
 *  cluster       – clustered point cloud
 *  skills        – constellation graph
 *  campus        – education blocks
 *  neural        – neural network layers (certifications)
 *  beacon        – signal mast broadcasting (contact)
 */
export const SCENES = [
  "intersection", "network", "magazine", "papers", "media", "cache", "gradcap", "meeting",
  "shelf", "frames", "reel", "memory", "bias", "gait", "cluster", "skills", "campus", "neural", "beacon",
];
