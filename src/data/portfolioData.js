export const portfolioData = {
  personal: {
    firstName: "Souvik",
    lastName: "Mandol",
    role: "Junior Engineer, BRTC BUET",
    email: "souvikmt99@gmail.com",
    phone: "+880 1880-701243",
    github: "github.com/minus69to",
    linkedin: "linkedin.com/in/souvikmandol",
    githubUrl: "https://github.com/minus69to",
    linkedinUrl: "https://linkedin.com/in/souvikmandol",
    resumeText: "Resume",
    resumeUrl: "/souvik-mandol/resume.pdf",
    imagePlaceholderText: "Photo",
  },
  nav: [
    { name: 'About', href: '#about' },
    { name: 'Education', href: '#education' },
    { name: 'Experience', href: '#experience' },
    { name: 'Projects', href: '#projects' },
    { name: 'Research', href: '#research' },
    { name: 'Skills', href: '#skills' },
    { name: 'Certifications', href: '#certifications' },
    { name: 'Contact', href: '#contact' },
  ],
  landing: {
    tag: "Welcome",
    headline: "GOT AN IDEA? LET'S BUILD IT.",
    subheadline: "Hi! This is Souvik, a software engineer at BRTC, BUET, building adaptive traffic signal control for Dhaka city. Passionate about AI, software engineering, system design, and robotics.",
    ctaText: "View My Work"
  },
  about: {
    tag: "About",
    headline: "SO… WHAT DO I ACTUALLY DO?",
    description: "I’m a software engineer and a recent CSE graduate from BUET. At BRTC I build the software behind an adaptive traffic signal system for Dhaka, which means my code now has opinions about real traffic. The rest of the time I teach computers how to do useful things using code, data, and a bit of stubborn debugging. I enjoy AI, automation, and system design, mainly because solving complex problems is more fun than pretending they don’t exist.",
    extrasTitle: "Beyond the terminal and the debugger:",
    extras: [
        "Mini-marathon runner aiming for a full marathon and maybe a triathlon someday.",
        "Not a foodie, more of a food hunter exploring new restaurants and cuisines.",
        "Cinephile who enjoys catching movies at Cineplex whenever possible.",
        "Beginner hobbyist photographer. Some shots live on my [Instagram](https://www.instagram.com/insomniyuck.537).",
        "Traveller who prefers hiking and hopes to reach ABC someday.",
        "New to the book-reading league but enjoying it a lot."
    ]
  },
  education: {
    tag: "Education",
    items: [
      {
        id: 1,
        degree: "BSC in Computer Science and Engineering",
        institution: "Bangladesh University of Engineering and Technology (BUET)",
        duration: "2022 - 2026",
        details: "CGPA: 3.31 / 4.00"
      },
      {
        id: 2,
        degree: "Higher Secondary",
        institution: "Dhaka Residential Model College",
        duration: "2018 - 2019"
      },
      {
        id: 3,
        degree: "Secondary School",
        institution: "Bagerhat Government High School",
        duration: "2013 - 2017"
      }
    ]
  },
  experience: {
    tag: "Experience",
    jobs: [
      {
        id: 1,
        title: "Junior Engineer (CSE)",
        company: "BRTC, Bangladesh University of Engineering and Technology",
        companyUrl: "https://www.buet.ac.bd/",
        duration: "Aug 2026 - Present",
        bullets: [
          "Government-funded national project (BRTC, BUET) building a locally developed adaptive traffic signal system for Dhaka city with Dhaka South City Corporation; live at 4 intersections, scaling to 30.",
          "Extend and maintain the Go and React/TypeScript platform (MQTT, PostgreSQL/TimescaleDB, WebSocket) that lets operators monitor and control signals from a tablet, with Telegram notifications on every change.",
          "Built the binary MQTT protocol layer and OTA firmware updates for STM32 Nucleo signal controllers, and the adaptive-mode pipeline that turns Jetson Orin Nano edge-vision traffic data into live, safety-clamped signal plans.",
          "Set up and run the on-premise server and private fiber network (IP addressing, Docker deployment) linking STM32 controllers, Jetson Orin Nano units, IP cameras and countdown timers, secured with per-device mTLS certificates and topic-level ACLs."
        ],
        bulletLinks: {}
      },
      {
        id: 2,
        title: "Software Engineer",
        company: "MerilSoft LLC",
        companyUrl: "https://merilsoft.com/",
        duration: "Dec 2025 - Apr 2026",
        bullets: [
          "Developed an AI-driven magazine generation platform - Magazine Works.",
          "Implemented file-handling systems on AWS and integrated AI-driven features using Google Vertex AI Studio.",
          "Worked on a restaurant system integrating existing online delivery platforms such as Uber Eats and DoorDash, along with a POS solution."
        ],
        bulletLinks: {
          "Magazine Works": "https://magazineworks.com/",
          "restaurant system": "https://zilluhalalfood.merilsoft.com/",
          "POS": "https://postest.merilsoft.com/"
        }
      }
    ]
  },
  projects: {
    tag: "Projects",
    items: [
      {
        id: 1,
        title: "ResearchQ",
        description: "An AI-assisted platform for systematic literature reviews. It searches OpenAlex with six strategies, screens papers with Google Gemini (confidence scores plus manual override), extracts metadata, and generates review outputs across 18 methodologies such as PRISMA, Cochrane and Kitchenham. Team project; alpha release archived on Zenodo, JOSS submission in preparation.",
        tags: ['SvelteKit', 'TypeScript', 'Node.js', 'Drizzle ORM', 'PostgreSQL', 'Google Gemini', 'OpenAlex'],
        featured: true,
        codeUrl: "https://github.com/ErenDexter/ResearchQ",
        demoUrl: ""
      },
      {
        id: 2,
        title: "GradPilot",
        description: "An AI-powered platform simplifying the graduate school application journey for Bangladeshi students. Features personalized recommendations, mentor connections, AI-driven SOP reviews, and scholarship discovery.",
        tags: ['Next.js', 'Spring Boot', 'PostgreSQL', 'Google Gemini AI', 'Microservices'],
        featured: true,
        codeUrl: "https://github.com/Navid-089/GradPilot",
        demoUrl: "https://youtu.be/fFfxtCi2y0I?si=RGYh-xErOwEJeG6B/"
      },
      {
        id: 3,
        title: "Collaborator",
        description: "A real-time video calling and meeting platform enabling users to create/join teams, conduct secure video meetings, exchange messages, and share files. Features meeting recording, AI-powered transcription and automatic meeting summaries.",
        tags: ['Next.js', 'TypeScript', 'Supabase', '100ms'],
        featured: true,
        codeUrl: "https://github.com/minus69to/Collaborator",
        demoUrl: "https://collaborator-blue.vercel.app/"
      },
      {
        id: 4,
        title: "Side-Channel Attack: Website Fingerprinting",
        description: "A cache-based side-channel attack that fingerprints websites from CPU cache timing patterns collected through a Selenium-automated browser pipeline, classified with two 1D CNN models in PyTorch, without intercepting any network traffic.",
        tags: ['Python', 'Flask', 'PyTorch', 'Selenium'],
        codeUrl: "https://github.com/minus69to/Side-Channel-Attack",
        demoUrl: ""
      },
      {
        id: 5,
        title: "Insomniyuck",
        description: "A personal memory archive with Markdown-based authoring and eight categorized sections spanning food, travel, running, books, movies and reflections, with media served via Cloudflare R2.",
        tags: ['SvelteKit', 'TypeScript', 'Cloudflare R2', 'Vercel'],
        codeUrl: "https://github.com/minus69to/Personal-Blog",
        demoUrl: "http://insomniyuck.me/"
      },
      {
        id: 6,
        title: "Art Gallery Management",
        description: "A comprehensive database project managing an art gallery. Includes features for preserving and selling art, alongside a review system for users to rate and comment on artworks.",
        tags: ['React', 'NodeJS', 'ExpressJS', 'Oracle', 'SQL'],
        codeUrl: "https://github.com/minus69to/CSE-216-Project",
        demoUrl: ""
      },
      {
        id: 7,
        title: "Movie Database",
        description: "A term project serving as a movie database providing detailed information. Allows users to search, view, and manage details through a user-friendly interface.",
        tags: ['Java', 'JavaFX'],
        codeUrl: "https://github.com/minus69to/L1-T2-Project",
        demoUrl: ""
      }
    ]
  },
  research: {
    tag: "Research",
    items: [
      {
        id: 1,
        status: "Published",
        title: "Multi-Model Machine Learning Analysis of Ecological Load Ratio Using Classification, Regression, and Clustering Approaches in EU Countries",
        description: "Co-authored a study of 27 EU countries (837 observations) predicting the Ecological Load Ratio (ELR) with seven tree-based classifiers and regressors and six clustering methods. Used PSO and genetic-algorithm feature selection (about 120 indicators down to 7), Optuna tuning and stratified K-fold cross-validation, reaching 0.987 accuracy and R² above 0.98. Population density and forest rents emerged as the strongest drivers. 8th IEOM Bangladesh International Conference, Dhaka, Dec 2025.",
        tags: ["Machine Learning", "PSO", "Clustering", "Supervised Regression"],
        paperUrl: "https://ieomsociety.org/proceedings/bangladesh2025/232.pdf"
      },
      {
        id: 2,
        status: "BSc Thesis",
        title: "Age-Aware Neurological Gait Pattern Discovery from Biomechanical Signals",
        description: "Built a 6-phase ML pipeline on a 188-subject multimodal gait dataset to separate age, walking speed, and neurological deficit in post-stroke gait. Created a polynomial aging manifold with bootstrap prediction intervals, a clinically interpretable synthetic gait generator validated by a leave-one-age-band-out falsification test, and exposed a leakage artefact through leakage-free nested cross-validation. EMG-derived Synergy Complexity Index tracks clinical walking ability; knee-power absorption is a speed-independent neurological marker.",
        tags: ["Machine Learning", "Signal Processing", "XGBoost", "NMF", "Statistical ML"]
      }
    ]
  },
  skills: {
    tag: "Technical Skills",
    categories: [
      { name: "Programming Languages", items: "Python, Go, C++, TypeScript, JavaScript, SQL, C, Java, HTML, CSS" },
      { name: "Backend & Systems", items: "Go, REST APIs, WebSocket, MQTT (Mosquitto), Binary Wire Protocols, mTLS / PKI, Docker, Linux, Tailscale, Private Fiber Network & IP Addressing" },
      { name: "Embedded & Edge", items: "STM32 Nucleo and Jetson Orin Nano (host-side integration), Robot Operating System (ROS), Arduino UNO, ATmega32" },
      { name: "Data Science & ML", items: "PyTorch, TensorFlow, Scikit-learn, XGBoost, Transformers, LangGraph, LoRA Fine-tuning, Numpy, Pandas" },
      { name: "Web Development", items: "React, Next.js, SvelteKit, Node.js, Express.js, Spring Boot, Laravel" },
      { name: "Cloud, DevOps & Tools", items: "AWS, Google Cloud (Vertex AI), Azure, Docker Compose, GitHub Actions, Vercel, Cloudflare R2, Git, Apache JMeter" },
      { name: "Database Systems", items: "PostgreSQL, TimescaleDB, Oracle, Supabase, Appwrite" }
    ]
  },
  certifications: {
    tag: "Certifications",
    items: [
      "Improving Deep Neural Networks: Hyperparameter Tuning, Regularization and Optimization",
      "Neural Networks and Deep Learning",
      "Structuring Machine Learning Projects",
      "Intermediate Machine Learning",
      "Intro to Machine Learning",
      "Pandas"
    ]
  },
  contact: {
    tag: "Contact",
    headline: "Let's build something great!"
  }
};
