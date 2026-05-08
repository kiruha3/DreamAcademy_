document.addEventListener('DOMContentLoaded', function() {
  const options = document.querySelectorAll('.option');
  const resultDiv = document.getElementById('result');

  options.forEach(function(button) {
    button.addEventListener('click', function() {
      const isCorrect = button.getAttribute('data-correct') === 'true';

      options.forEach(function(btn) {
        btn.disabled = true;
        if (btn.getAttribute('data-correct') === 'true') {
          btn.classList.add('correct');
        } else if (btn === button) {
          btn.classList.add('incorrect');
        }
      });

      if (isCorrect) {
        resultDiv.textContent = '✅ Правильно! DreamDocs используется для автоматизации документооборота.';
        resultDiv.className = 'result show success';
      } else {
        resultDiv.textContent = '❌ Неверно. Попробуйте ещё раз (обновите страницу).';
        resultDiv.className = 'result show error';
      }
    });
  });

  // Animate topics on scroll
  const topics = document.querySelectorAll('.topic');
  topics.forEach(function(topic, index) {
    topic.style.opacity = '0';
    topic.style.transform = 'translateY(20px)';
    setTimeout(function() {
      topic.style.transition = 'all 0.5s ease';
      topic.style.opacity = '1';
      topic.style.transform = 'translateY(0)';
    }, 200 + index * 150);
  });
});
