# Связь родительской страницы с 3D-картой, версия 1

> Актуальная установка и явная команда `focusView`: [FILTER-NAVIGATION.md](FILTER-NAVIGATION.md). Ниже сохранён исходный протокол; `setFilters` по-прежнему не двигает камеру.

Предпросмотр: https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/landscape/?place=all

Тестовый родитель: https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/landscape/integration-demo.html

В этом этапе изменено только 3D-приложение. Исходника действующей Яндекс.Карты и доступа к Tilda нет; код управления Яндекс.Картой не добавлялся.

## Подключение и доверенный источник

Укажите в URL iframe `parentOrigin` — **точный origin опубликованного сайта**, например `https://visitbeloretsk.ru`, без завершающего `/`, пути, wildcard или учётных данных. `https://www.visitbeloretsk.ru` — другой origin. Протокол не предназначен для непрозрачного origin `null`. Без параметра допускается только родитель с тем же origin, что у 3D-приложения.

```js
const mapOrigin = 'https://poletavkinvladislav2025-dot.github.io';
const frame = document.querySelector('#visit-3d');
const url = new URL('/mratkino-3d-map/preview/landscape/', mapOrigin);
url.searchParams.set('place', 'all');
url.searchParams.set('parentOrigin', location.origin);
frame.src = url.href;
let sequence = 0;
function send(command, payload = {}) {
  frame.contentWindow.postMessage({
    type: 'vb3d.command', version: 1,
    id: 'site-' + (++sequence), command, payload,
  }, mapOrigin);
}
window.addEventListener('message', e => {
  if (e.origin !== mapOrigin || e.source !== frame.contentWindow) return;
  const message = e.data;
  if (message?.type !== 'vb3d.event' || message.version !== 1) return;
  if (message.event === 'ready') {
    // Теперь можно передавать текущее место из состояния сайта.
  }
  // Не отправляйте setCamera автоматически в ответ на cameraChanged.
});
```

В iframe нужны `allow="fullscreen" allowfullscreen` и заданная высота. При использовании sandbox необходимы `allow-scripts allow-same-origin` (и разрешение полноэкранного режима). Самостоятельная страница работает без родителя.

## Команды

Корневые ключи сообщения: `type`, `version`, `id`, `command`, `payload`. Неизвестные ключи и неверные типы отклоняются. ID запроса — уникальная строка из 1–80 букв, цифр и символов `_.:-`.

| command | payload | Поведение |
|---|---|---|
| `openPlace` | `{placeId:'abzakovo'}` | Выбрать место, открыть карточку, приблизить камеру |
| `openRoute` | `{routeId:'abzakovo/trail/1'}` | Выбрать весь маршрут, включая все его сегменты, и показать его |
| `setCamera` | `{center:{lat:53.8,lng:58.6},zoom:14,pitch:48,bearing:0}` | Изменить только камеру; поля необязательны, хотя бы одно обязательно |
| `setFilters` | `{view:'places'|'stamps'|'passport'|'all'}` и/или дополнительные boolean `ski/nordic/hiking` | Изменить объекты, сохраняя движок, камеру и режим движения |
| `resize` | `{}` | Пересчитать размер после показа или изменения iframe |
| `suspend` | `{}` | Остановить движение камеры, освободить тяжёлую сцену, сохранить предпочтения |
| `resume` | `{}` | Пересчитать размер и восстановить допустимую сцену в текущей области |

Координаты: `lat` от −85 до 85, `lng` от −180 до 180. В адаптере они преобразуются в `[lng,lat]` MapLibre. `zoom`: 3–20.2; `pitch`: 0–85; `bearing`: −180–180. Только конечные числа, без строк. Масштаб Яндекса и MapLibre приблизительно сопоставим, вид при разных наклонах не совпадает точно.

Валидные команды до готовности стоят в очереди (максимум 32). `suspend`/`resume` применяются сразу. Отправлять следует после загрузки документа iframe; сообщения, отправленные до запуска JS, браузер не хранит. Лучше дождаться `ready`. Повторяющийся ID выполняется один раз; последние 128 результатов кешируются.

## События

```js
{
  type: 'vb3d.event', version: 1,
  event: 'commandResult', requestId: 'site-1',
  payload: {command:'openPlace', ok:true, placeId:'abzakovo', routeId:null, camera:{/* ... */}}
}
```

| event | payload |
|---|---|
| `ready` | `{placeId,routeId,camera,commands:[...]}` |
| `placeSelected` | `{placeId}` — явный выбор посетителя |
| `routeSelected` | `{placeId,routeId}` — явный выбор посетителя |
| `cameraChanged` | `{center:{lat,lng},zoom,pitch,bearing}` — не чаще одного раза в 250 мс |
| `filtersChanged` | `{filters:{view,ski,nordic,hiking,interesting,stamps,passport}}` — только пользовательское изменение; команды родителя подтверждаются без эха |
| `commandResult` | `{command,ok:true,placeId,routeId,camera}` + `requestId` |
| `error` | `{code,message,recoverable}` + `requestId`, если применимо |

Коды: `INVALID_COMMAND`, `QUEUE_FULL`, `UNKNOWN_ROUTE`, `COMMAND_FAILED`, `DATA_UNAVAILABLE`, `WEBGL_UNAVAILABLE`. Последний позволяет будущей родительской странице предложить обычную карту. Повторная успешная загрузка 3D отправляет новый `ready`.

Команды родителя не порождают обратные `placeSelected`/`routeSelected`/`cameraChanged`: результат возвращается через `commandResult`. Обычное перемещение камеры не выбирает место и не открывает карточки. События сами по себе не перемещают камеру. Проверяются и `event.origin`, и `event.source === window.parent`; сообщения соседних iframe и самой карты не принимаются.

Статичные объёмные объекты не зависят от effects. При скрытии вкладки или выходе iframe из области просмотра тяжёлая сцена освобождается. Для переключателя двух карт родитель дополнительно отправляет `suspend` перед скрытием, затем `resume` и `resize` после показа. Это работает и для случаев, когда iframe скрыт родительским интерфейсом, недоступным из дочернего документа.

## Стабильные идентификаторы и URL

Места: `all`, `beloretsk`, `mratkino`, `abzakovo`, `yalangas`, `malinovaya`, `malinovaya-3` и новые `ethnopark`, `bannoye`, `rodeo`, `zavyaliha`, `euroasia`, `sunny-valley`, `minyar`, `adzhigardak`, `kushtau`, `ak-yort`, `ufa-biathlon`, `abzakovo-biathlon`. Реестры: [`places.json`](../src/region/places.json) и [`winter-places.json`](../src/region/winter-places.json). Точный реестр мест также доступен в [`presets.js`](../src/region/presets.js).

После переноса исходной карты добавлены городские места и шесть точек штампов: `stampStation`, `kiosk3`, `kiosk2`, `kiosk4`, `kiosk7`, `kiosk8`. [Все 37 соответствий и решения о координатах](PASSPORT-MIGRATION.md). Данные: [`passport-source.json`](../src/region/passport-source.json). Алиасы принимаются в URL и `openPlace`; ответ содержит канонический ID.

Исходные ID доступны однозначно как `yandex:{sourceId}`. Например, `?place=yandex%3Amalinovaya` и `openPlace {placeId:'yandex:malinovaya'}` открывают **Третью** Малиновую (`malinovaya-3`). Старый 3D-ID `malinovaya` продолжает открывать **Первую**; исходный `malinovaya1` — её дополнительный alias. Это разрешает конфликт исходников без переименования старых пеших маршрутов `malinovaya/...`. `bigIremel` также принимается как alias `iremel`; полный список формирует `PLACE_ALIASES` в presets.js.

Маршруты:

- `abzakovo/trail/{1,2,3,4,5,7,8,9,10,11,12,13}`; №6 не добавлен без геометрии.
- `mratkino/trail/south-{1,2,3,4}` и `mratkino/trail/north-{1,2,3}`.
- `malinovaya/first-return`, `malinovaya/third`, `malinovaya/three-peaks`.
- `yalangas/a1`, `yalangas/a2`.
- Новая геометрия: `{placeId}/way/{osmWayId}`, например `bannoye/way/29031015`. Проверяется формат и известное место; существование конкретного way сверяется после ленивой загрузки данных. Неизвестный объект возвращает UNKNOWN_ROUTE.

URL хранит `place`, `route`, `card=0|1`, `effects=0|1`, `lat`, `lng`, `z`, `pitch`, `bearing`. Пример: `?place=abzakovo&route=abzakovo/trail/1&effects=0`. ID маршрута приоритетнее места; сохранённая камера приоритетнее начального приближения к маршруту. Эффекты также сохраняются в localStorage, явный параметр URL имеет приоритет. `parentOrigin` при обновлении URL сохраняется.

## Следующий этап в Tilda

Для новой версии выполнены приложение и готовый переключатель с адаптером: [UNIFIED-CONTROLS.md](UNIFIED-CONTROLS.md). Отдельный адрес `/preview/unified/`; прежний Landscape сохранён. `ready` и `commandResult` дополнены `filters`. Подробная схема setFilters, очередь готовности и точечные вставки в существующее замыкание Яндекса приведены в этом документе. Установка в кабинет Tilda не выполнялась.

1. Получить фактический исходник существующего T123 с Яндекс.Картой и точный origin сайта.
2. Добавить iframe 3D и переключатель режимов; не дублировать инициализацию Яндекса.
3. Сопоставить ID мест/маршрутов с объектами существующей карты.
4. Хранить общий выбранный объект в родительской странице; передавать команды только при действиях посетителя или смене режима.
5. Подключить suspend/resume/resize, обработку WEBGL_UNAVAILABLE и проверить высоту/полный экран на опубликованной странице телефона.
6. После проверки выбрать постоянный URL релиза вместо тестового `/preview/landscape/`.
