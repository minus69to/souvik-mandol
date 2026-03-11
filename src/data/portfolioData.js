export const portfolioData = {
  personal: {
    firstName: "Souvik",
    lastName: "Mandol",
    // role: "Software Engineer",
    email: "souvikmt99@gmail.com",
    phone: "01880701243",
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
    subheadline: "Hi! This is Souvik, a remote software engineer at Merilsoft LLC, passionate about AI, software engineering, system design, and robotics.",
    ctaText: "View My Work"
  },
  about: {
    tag: "About",
    headline: "SO… WHAT DO I ACTUALLY DO?",
    description: "I’m a remote software engineer and a final year CSE student at BUET. I spend most of my time teaching computers how to do useful things using code, data, and a bit of stubborn debugging. I enjoy AI, automation, and system design, mainly because solving complex problems is more fun than pretending they don’t exist.",
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
        duration: "2022 - Present",
        details: "Level - 4, Term - 2"
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
        title: "Software Engineer",
        company: "MerilSoft LLC",
        companyUrl: "https://merilsoft.com/",
        duration: "Dec 2025 - Present",
        bullets: [
          "Developed an AI-driven magazine generation platform - Magazine Works.",
          "Implemented file-handling systems on AWS and integrated AI-driven features using Google Vertex AI Studio.",
          "Currently working on a restaurant system integrating existing online delivery platforms such as Uber Eats and DoorDash, along with a POS solution."
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
        title: "GradPilot",
        description: "An AI-powered platform simplifying the graduate school application journey for Bangladeshi students. Features personalized recommendations, mentor connections, AI-driven SOP reviews, and scholarship discovery.",
        tags: ['Next.js', 'Spring Boot', 'PostgreSQL', 'Google Gemini AI', 'Microservices'],
        featured: true,
        codeUrl: "#", 
        demoUrl: "#"  
      },
      {
        id: 2,
        title: "Collaborator",
        description: "A real-time video calling and meeting platform enabling users to create/join teams, conduct secure video meetings, exchange messages, and share files. Features meeting recording and AI-powered transcription.",
        tags: ['Next.js', 'TypeScript', 'Supabase', '100ms'],
        featured: true,
        codeUrl: "#", 
        demoUrl: "#"
      },
      {
        id: 3,
        title: "Art Gallery Management",
        description: "A comprehensive database project managing an art gallery. Includes features for preserving and selling art, alongside a review system for users to rate and comment on artworks.",
        tags: ['React', 'NodeJS', 'ExpressJS', 'Oracle', 'SQL'],
        codeUrl: "#",
        demoUrl: "" 
      },
      {
        id: 4,
        title: "Typing Tom",
        description: "A typing learning game where a player must type displayed letters to overcome obstacles. If hit, players must type a sentence within a time limit to revive.",
        tags: ['C', 'iGraphics'],
        codeUrl: "#",
        demoUrl: ""
      },
      {
        id: 5,
        title: "Movie Database",
        description: "A term project serving as a movie database providing detailed information. Allows users to search, view, and manage details through a user-friendly interface.",
        tags: ['Java', 'JavaFX'],
        codeUrl: "#",
        demoUrl: ""
      },
      {
        id: 6,
        title: "You Can't Imagine",
        description: "A single-player game consisting of three different types of games, offering a variety of challenges with unique gameplay mechanics.",
        tags: ['Python', 'Pygame'],
        codeUrl: "#",
        demoUrl: ""
      }
    ]
  },
  research: {
    tag: "Research",
    items: [
      {
        id: 1,
        status: "Ongoing",
        title: "Biological Gait Pattern Analysis with 3D Data Augmentation",
        description: "Analyzing 3D medical gait data using deep learning and machine learning techniques, including 3D data augmentation methods to enrich limited datasets for improved medical analysis and model performance.",
        tags: ["Deep Learning", "Machine Learning", "Medical 3D Data", "Matlab"]
      },
      {
        id: 2,
        status: "Accepted",
        title: "Machine Learning-Based Ecological Sustainability Analysis Using ELR",
        description: "Conducted a comprehensive machine learning study to analyze and predict ecological sustainability across 27 EU countries using Ecological Load Ratio (ELR). Achieved over 98% classification accuracy and R²>0.97.",
        tags: ["Machine Learning", "PSO", "Clustering", "Supervised Regression"]
      }
    ]
  },
  skills: {
    tag: "Technical Skills",
    categories: [
      { name: "Programming", items: "Python, C, C++, Java, Fortran, JavaScript, LaTeX, HTML, SQL" },
      { name: "Web Development", items: "React, Laravel, Next.js, Node.js, Express.js, CSS, Spring Boot, Azure, AWS" },
      { name: "Database Systems", items: "Oracle, Appwrite, PostgreSQL" },
      { name: "Data Science & ML", items: "TensorFlow, PyTorch, Transformers, Scikit-learn, Numpy, Pandas" },
      { name: "Software & Tools", items: "AutoCAD, Packet Tracer, Apache JMeter, MS Office" },
      { name: "Robotics", items: "Robot Operating System (ROS), Arduino UNO, ATmega32" }
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
