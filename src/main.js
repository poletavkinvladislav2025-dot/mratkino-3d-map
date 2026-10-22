import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="page">
    <p class="eyebrow">Visit Beloretsk · Прототип</p>
    <h1>Мраткино</h1>
    <p class="description">Интерактивная карта горнолыжного центра — в разработке.</p>
    <div class="map-placeholder" role="img" aria-label="Место для будущей интерактивной карты склонов Мраткино">
      <span>Здесь появятся объёмный рельеф, трассы и подъёмники</span>
    </div>
    <p class="note">Трассы, высоты и подъёмники необходимо сверить с исходной схемой до публикации.</p>
  </main>
`;
