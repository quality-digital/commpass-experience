export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  maxPoints: number;
  timePerQuestion: number;
};

export const QUIZZES: Quiz[] = [
  {
    id: "quiz-quality",
    title: "Quiz Quality Digital",
    description: "Teste seus conhecimentos sobre VTEX, Jitterbit e ecommerce",
    timePerQuestion: 15,
    maxPoints: 300,
    questions: [
      {
        question: "Qual é o principal diferencial da VTEX como plataforma?",
        options: [
          "Apenas para pequenas empresas",
          "Foco exclusivo em B2C",
          "Arquitetura composable e headless para B2B e B2C",
          "Sistema legado on-premise",
        ],
        correctIndex: 2,
        explanation: "A VTEX oferece arquitetura composable e headless, ideal para experiências omnichannel em B2B e B2C.",
      },
      {
        question: "O que significa LGPD?",
        options: [
          "Lei Geral de Proteção de Dados",
          "Lei Geral de Privacidade Digital",
          "Lei Geral de Proteção Digital",
          "Lei Geral de Processamento de Dados",
        ],
        correctIndex: 0,
        explanation: "A LGPD (Lei Geral de Proteção de Dados) regula o tratamento de dados pessoais no Brasil.",
      },
      {
        question: "Qual solução a Jitterbit oferece?",
        options: [
          "Design de interfaces",
          "Integração de sistemas e APIs",
          "Hospedagem de sites",
          "Gestão de RH",
        ],
        correctIndex: 1,
        explanation: "A Jitterbit é especializada em integração de sistemas, APIs e automação de processos.",
      },
      {
        question: "O que é headless commerce?",
        options: [
          "Comércio sem produtos",
          "Separação entre front-end e back-end",
          "Loja sem funcionários",
          "Comércio apenas por voz",
        ],
        correctIndex: 1,
        explanation: "Headless commerce separa a camada de apresentação (front-end) da lógica de negócios (back-end).",
      },
      {
        question: "Qual é o foco principal do VTEX Day?",
        options: [
          "Entretenimento",
          "Gastronomia",
          "Digital commerce e tecnologia",
          "Esportes",
        ],
        correctIndex: 2,
        explanation: "O VTEX Day é o maior evento de digital commerce da América Latina.",
      },
    ],
  },
  {
    id: "quiz-jitterbit",
    title: "Quiz Jitterbit",
    description: "Teste seus conhecimentos sobre integração e automação",
    timePerQuestion: 15,
    maxPoints: 300,
    questions: [
      {
        question: "O que é uma API?",
        options: [
          "Um tipo de banco de dados",
          "Interface de programação de aplicações",
          "Um framework JavaScript",
          "Um protocolo de segurança",
        ],
        correctIndex: 1,
        explanation: "API (Application Programming Interface) permite a comunicação entre diferentes sistemas.",
      },
      {
        question: "Qual é a principal função da Jitterbit Harmony?",
        options: [
          "Criar websites",
          "Integrar sistemas e automatizar processos",
          "Gerenciar redes sociais",
          "Editar vídeos",
        ],
        correctIndex: 1,
        explanation: "Jitterbit Harmony é uma plataforma de integração e automação de processos empresariais.",
      },
      {
        question: "O que é iPaaS?",
        options: [
          "Internet Protocol as a Service",
          "Integration Platform as a Service",
          "Internal Platform as a System",
          "Integrated Processing and Storage",
        ],
        correctIndex: 1,
        explanation: "iPaaS (Integration Platform as a Service) é uma plataforma em nuvem para integração de dados e aplicações.",
      },
      {
        question: "Qual benefício a integração de sistemas traz?",
        options: [
          "Aumenta a complexidade",
          "Elimina a necessidade de dados",
          "Automatiza processos e reduz erros",
          "Substitui todos os sistemas",
        ],
        correctIndex: 2,
        explanation: "A integração automatiza processos manuais, reduz erros e aumenta a eficiência operacional.",
      },
      {
        question: "O que é automação de processos?",
        options: [
          "Substituir pessoas por robôs físicos",
          "Usar tecnologia para executar tarefas repetitivas automaticamente",
          "Eliminar todos os processos da empresa",
          "Criar processos mais complexos",
        ],
        correctIndex: 1,
        explanation: "Automação de processos usa tecnologia para executar tarefas repetitivas sem intervenção manual.",
      },
    ],
  },
];

export const RANKING_MOCK = [
  { name: "Ana Silva", points: 850, avatar: "🦄" },
  { name: "Carlos Mendes", points: 720, avatar: "🏆" },
  { name: "Julia Costa", points: 680, avatar: "⚡" },
  { name: "Pedro Santos", points: 620, avatar: "🧭" },
  { name: "Maria Oliveira", points: 580, avatar: "🎯" },
  { name: "Lucas Ferreira", points: 540, avatar: "🐉" },
  { name: "Fernanda Lima", points: 490, avatar: "🛒" },
  { name: "Rafael Souza", points: 450, avatar: "⚙️" },
  { name: "Beatriz Alves", points: 410, avatar: "🧙" },
  { name: "Diego Martins", points: 380, avatar: "🧭" },
];

export const BRANDS = [
  {
    id: "quality",
    name: "Quality Digital",
    description: "Especialista em soluções de digital commerce, implementação VTEX e transformação digital.",
    cases: "Projetos de sucesso com grandes marcas do varejo brasileiro, entregando experiências omnichannel de alta performance.",
    website: "https://www.qualitydigital.com.br",
    color: "from-blue-400 to-cyan-500",
    emoji: "💎",
  },
  {
    id: "jitterbit",
    name: "Jitterbit",
    description: "Líder em integração de sistemas e automação de processos empresariais com a plataforma Harmony.",
    cases: "Mais de 50.000 empresas confiam na Jitterbit para conectar sistemas, automatizar processos e acelerar a transformação digital.",
    website: "https://www.jitterbit.com",
    color: "from-orange-400 to-red-500",
    emoji: "⚡",
  },
];
