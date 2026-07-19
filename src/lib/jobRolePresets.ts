export interface JobRolePreset {
  title: string;
  category: string;
  description: string;
}

export const JOB_ROLE_PRESETS: JobRolePreset[] = [
  {
    title: "Software Engineering Intern",
    category: "Tech",
    description:
      "We're looking for a Software Engineering Intern to join our engineering team for a summer/semester internship. You'll work alongside senior engineers on real production features, write clean and tested code, and participate in code reviews and daily standups. Requirements: currently pursuing a degree in Computer Science or a related field, solid understanding of at least one programming language (Python, Java, JavaScript, or C++), familiarity with data structures and algorithms, and a genuine curiosity to learn how large systems are built and shipped.",
  },
  {
    title: "Associate Software Engineer",
    category: "Tech",
    description:
      "As an Associate Software Engineer, you'll join a product team to design, build, and maintain features across the stack under the guidance of senior engineers. Responsibilities include writing clean, well-tested code, participating in code reviews, debugging production issues, and collaborating with product and design. Requirements: 0-2 years of experience, strong fundamentals in data structures, algorithms, and OOP, proficiency in at least one modern language (Java, Python, JavaScript/TypeScript, or Go), and familiarity with REST APIs and relational databases.",
  },
  {
    title: "Software Development Engineer",
    category: "Tech",
    description:
      "We're hiring a Software Development Engineer to own end-to-end features — from design through deployment and monitoring. You'll write scalable, maintainable code, design APIs and data models, debug complex production issues, and mentor junior engineers. Requirements: 2-5 years of professional software development experience, strong CS fundamentals (algorithms, system design basics, concurrency), experience with cloud platforms (AWS/GCP/Azure), and a track record of shipping reliable, well-tested software.",
  },
  {
    title: "Senior Software Engineer",
    category: "Tech",
    description:
      "As a Senior Software Engineer, you'll lead the design and implementation of complex, high-impact features, set technical direction for your team, and mentor other engineers. You'll partner closely with product and design to translate ambiguous requirements into robust technical solutions, and you'll be a key voice in architecture and code review. Requirements: 5+ years of experience building production systems at scale, deep expertise in system design, strong communication skills, and experience owning a service or feature area end-to-end.",
  },
  {
    title: "Principal Software Engineer",
    category: "Tech",
    description:
      "We're looking for a Principal Software Engineer to drive technical strategy across multiple teams. You'll define architecture standards, lead complex cross-team technical initiatives, and act as a force multiplier through mentorship and design review. Requirements: 8+ years of experience, a strong track record of designing and scaling distributed systems, excellent communication and cross-functional influence, and the ability to balance long-term technical vision with pragmatic delivery.",
  },
  {
    title: "Backend Engineer",
    category: "Tech",
    description:
      "As a Backend Engineer, you'll design and build the services, APIs, and data pipelines that power our product. Responsibilities include designing scalable database schemas, building resilient APIs, optimizing performance, and ensuring system reliability. Requirements: strong experience with server-side languages (Java, Go, Python, or Node.js), solid understanding of relational and NoSQL databases, experience with microservices and message queues, and familiarity with cloud infrastructure and CI/CD pipelines.",
  },
  {
    title: "Frontend Engineer",
    category: "Tech",
    description:
      "We're looking for a Frontend Engineer to build fast, accessible, and delightful user interfaces. You'll work closely with designers to translate mockups into production-quality components, optimize for performance, and maintain a shared design system. Requirements: strong proficiency in JavaScript/TypeScript and a modern framework (React, Vue, or Angular), solid understanding of HTML/CSS and web performance, experience with state management and testing, and an eye for detail in UI/UX.",
  },
  {
    title: "Full Stack Engineer",
    category: "Tech",
    description:
      "As a Full Stack Engineer, you'll build features spanning the frontend, backend, and data layer — from designing APIs to building the UI that consumes them. Requirements: proficiency in a modern frontend framework (React or similar) and a backend language (Node.js, Python, Java, or Go), solid understanding of databases and API design, experience with cloud deployment, and comfort context-switching between the full stack of a product.",
  },
  {
    title: "DevOps / Site Reliability Engineer",
    category: "Tech",
    description:
      "We're hiring a DevOps/SRE to build and maintain the infrastructure that keeps our systems reliable, scalable, and secure. Responsibilities include managing CI/CD pipelines, infrastructure as code, monitoring and alerting, and incident response. Requirements: experience with cloud platforms (AWS/GCP/Azure), infrastructure-as-code tools (Terraform, CloudFormation), containerization (Docker, Kubernetes), scripting (Python or Bash), and a strong understanding of networking and system reliability principles.",
  },
  {
    title: "Data Engineer",
    category: "Tech",
    description:
      "As a Data Engineer, you'll design, build, and maintain the data pipelines and infrastructure that power analytics and machine learning across the company. Responsibilities include building ETL/ELT pipelines, optimizing data warehouses, and ensuring data quality and reliability. Requirements: strong SQL and Python skills, experience with data pipeline tools (Airflow, Spark, dbt), familiarity with cloud data warehouses (Snowflake, BigQuery, Redshift), and an understanding of data modeling best practices.",
  },
  {
    title: "Machine Learning Engineer",
    category: "Tech",
    description:
      "We're looking for a Machine Learning Engineer to design, train, and deploy ML models into production systems. Responsibilities include building data and feature pipelines, training and evaluating models, and productionizing them with robust monitoring. Requirements: strong Python skills, experience with ML frameworks (PyTorch or TensorFlow), solid understanding of statistics and model evaluation, and experience deploying models into production environments.",
  },
  {
    title: "QA / Test Engineer",
    category: "Tech",
    description:
      "As a QA/Test Engineer, you'll ensure the quality and reliability of our software through both manual and automated testing. Responsibilities include designing test plans, writing automated test suites, identifying and tracking bugs, and collaborating with engineers to improve testability. Requirements: experience with test automation frameworks (Selenium, Cypress, Playwright), strong understanding of QA methodologies, scripting skills (Python or JavaScript), and sharp attention to detail.",
  },
  {
    title: "Engineering Manager",
    category: "Tech",
    description:
      "We're hiring an Engineering Manager to lead a team of software engineers, balancing people management with technical oversight. Responsibilities include running the team's planning and delivery, coaching and growing engineers, and partnering with product leadership to set roadmap and priorities. Requirements: 6+ years of engineering experience with 2+ years in a leadership or mentorship role, strong technical judgment, and excellent communication and people-management skills.",
  },
  {
    title: "Product Manager (Technical)",
    category: "Product",
    description:
      "As a Technical Product Manager, you'll own the roadmap for a technical product area, working closely with engineering to define requirements, prioritize the backlog, and ship features that solve real user problems. Requirements: experience in product management or a technical role, strong analytical skills, comfort discussing architecture and trade-offs with engineers, and excellent written and verbal communication.",
  },
];

export const CUSTOM_ROLE_VALUE = "__custom__";
