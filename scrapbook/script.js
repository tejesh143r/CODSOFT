document.addEventListener('DOMContentLoaded', () => {
  const pickButton = document.getElementById('pickButton');
  const loseButton = document.getElementById('loseButton');
  const playMessage = document.getElementById('playMessage');
  const confettiArea = document.getElementById('confettiArea');

  if (pickButton) {
    const escapeButton = () => {
      const boundary = pickButton.parentElement.getBoundingClientRect();
      const maxX = Math.max(boundary.width - pickButton.offsetWidth, 0);
      const maxY = Math.max(boundary.height - pickButton.offsetHeight, 0);
      const randomX = Math.random() * maxX;
      const randomY = Math.random() * maxY;
      pickButton.style.transform = `translate(${randomX}px, ${randomY}px)`;
      pickButton.classList.add('btn-escape');
      setTimeout(() => pickButton.classList.remove('btn-escape'), 300);
      playMessage.textContent = 'Oops! It escaped again—keep chasing if you dare.';
    };

    pickButton.addEventListener('mouseenter', escapeButton);
    pickButton.addEventListener('click', (event) => {
      event.preventDefault();
      escapeButton();
    });
  }

  if (loseButton) {
    loseButton.addEventListener('click', () => {
      loseButton.classList.toggle('faded');
      playMessage.textContent = loseButton.classList.contains('faded')
        ? 'It vanished like a dream, but your smile stayed.'
        : 'You found it again—some things are never lost.';
    });
  }

  if (confettiArea) {
    for (let i = 0; i < 24; i += 1) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 90 + 5}%`;
      piece.style.background = `hsl(${Math.random() * 340 + 10}, 82%, 70%)`;
      piece.style.animationDelay = `${Math.random() * 2}s`;
      piece.style.width = `${Math.random() * 12 + 8}px`;
      piece.style.height = `${Math.random() * 12 + 8}px`;
      confettiArea.appendChild(piece);
    }
  }

  const stickers = document.querySelectorAll('.sticker.floating');
  stickers.forEach((sticker, index) => {
    const delay = Math.random() * 2;
    sticker.style.animationDelay = `${delay}s`;
    sticker.style.animationDuration = `${4 + Math.random() * 3}s`;
  });
});
