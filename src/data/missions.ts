export type MissionType = "digital" | "presencial" | "quiz" | "social";
export type Difficulty = "fácil" | "médio" | "difícil";
export type MissionStatus = "available" | "completed" | "locked";

export type Mission = {
  id: string;
  name: string;
  description: string;
  points: number;
  type: MissionType;
  difficulty: Difficulty;
  location?: string;
  action?: string;
  actionLabel?: string;
};

export const MISSIONS: Mission[] = [
  {
    id: "cadastro-simples",
    name: "Cadastro Simples",
    description: "Realize o pré-cadastro básico no app antes do evento e garanta a entrada na corrida de pontos.",
    points: 50,
    type: "digital",
    difficulty: "fácil",
  },
  {
    id: "cadastro-completo",
    name: "Cadastro Completo",
    description: "Preencha todos os dados do seu perfil antes do evento para desbloquear missões exclusivas.",
    points: 100,
    type: "digital",
    difficulty: "fácil",
  },
  {
    id: "presenca-estande",
    name: "Presença no Estande",
    description: "Escaneie o QR Code na Estação Commerce e registre sua presença no evento.",
    points: 75,
    type: "presencial",
    difficulty: "fácil",
    location: "Estação Commerce",
    action: "qr",
    actionLabel: "Escanear QR",
  },
  {
    id: "quiz-quality",
    name: "Quiz Quality Digital",
    description: "Teste seus conhecimentos sobre as soluções e cases de sucesso da Quality Digital.",
    points: 100,
    type: "quiz",
    difficulty: "médio",
    action: "quiz",
    actionLabel: "Iniciar Quiz",
  },
  {
    id: "quiz-jitterbit",
    name: "Quiz Jitterbit",
    description: "Teste seus conhecimentos sobre as soluções de integração da Jitterbit.",
    points: 100,
    type: "quiz",
    difficulty: "médio",
    action: "quiz",
    actionLabel: "Iniciar Quiz",
  },
  {
    id: "social-foto",
    name: "Foto no Estande",
    description: "Tire uma foto no estande e compartilhe nas redes sociais com a hashtag #CommPass.",
    points: 150,
    type: "social",
    difficulty: "fácil",
    action: "upload",
    actionLabel: "Enviar Foto",
  },
  {
    id: "video-jitterbit",
    name: "Assistir Vídeo Jitterbit",
    description: "Assista ao vídeo institucional da Jitterbit e ganhe pontos.",
    points: 50,
    type: "digital",
    difficulty: "fácil",
    action: "video",
    actionLabel: "Assistir",
  },
  {
    id: "presenca-palestra",
    name: "Presença na Palestra",
    description: "Marque presença na palestra principal escaneando o QR Code.",
    points: 100,
    type: "presencial",
    difficulty: "médio",
    location: "Auditório Principal",
    action: "qr",
    actionLabel: "Escanear QR",
  },
];
