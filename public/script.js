document.addEventListener('DOMContentLoaded', function() {
  console.log('Документ загружен, ищем кнопку...');
  const createBtn = document.querySelector('.create-btn');

  if (createBtn) {
    console.log('Кнопка найдена, добавляем обработчик...');
    createBtn.addEventListener('click', createPortfolio);
  } else {
    console.error('Кнопка .create-btn не найдена!');
  }
});

async function createPortfolio() {
  console.log('Функция createPortfolio вызвана');

  const name = document.getElementById("name").value;
  const about = document.getElementById("about").value;
  const files = document.getElementById("works").files;

  console.log('Получены значения:', { name, about, files: files.length });

  if (!name) {
    showNotification('Пожалуйста, введите ваше имя', true);
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('about', about);

  for (let i = 0; i < files.length; i++) {
    formData.append('works', files[i]);
    console.log(`Добавлен файл: ${files[i].name}`);
  }

  try {
    console.log('Отправка запроса на /api/portfolio...');

    const response = await fetch('/api/portfolio', {
      method: 'POST',
      body: formData
    });

    console.log('Ответ получен, статус:', response.status);

    if (response.redirected) {
      console.log('Перенаправление на:', response.url);
      window.location.href = response.url;
    } else {
      const result = await response.json();
      console.log('Результат:', result);

      if (result.error) {
        showNotification(result.error, true);
      } else if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    }
  } catch (error) {
    console.error('Ошибка сети:', error);
    showNotification('Ошибка сети: ' + error.message, true);
  }
}

function showNotification(message, isError = false) {
  console.log(`Показ уведомления: ${message}`);
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}