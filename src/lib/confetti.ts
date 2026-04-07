import confetti from "canvas-confetti";

export const fireConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#06b6d4", "#f97316", "#facc15", "#10b981", "#8b5cf6"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#06b6d4", "#f97316", "#facc15", "#10b981", "#8b5cf6"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };

  frame();
};

export const fireStars = () => {
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    shapes: ["star"],
    colors: ["#facc15", "#f97316", "#06b6d4"],
    scalar: 1.2,
  });
};
