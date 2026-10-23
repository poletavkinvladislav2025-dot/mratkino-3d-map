# Однократный аудит зимних мест и семантических тайлов

Проверка 23.10.2026. `sources.json` — HTTP-результаты указанных владельцем страниц. `geocoding.json` и уточняющие `*-geocoding.json` — ответы Nominatim; неоднозначные совпадения отвергались. Например, база Межгорья не использована для Белорецка, вершина Аджигардак — для курорта, вершина Куштау — для ГЛЦ.

Сырые `*.xml`, `*.html`, `*.txt` — локальный исследовательский кеш, исключён из Git. API OSM запрашивался ограниченными bbox, не на каждом движении браузерной карты. Контрольные суммы XML: `public/region/catalog/audit.json`; сохранённая геометрия содержит точные `sourceUrl` каждого way.

Для повторной подготовки при наличии сырьевого кеша:

```
python scripts/prepare-winter-catalog.py
python scripts/extend-nordic-catalog.py
python scripts/extend-kushtau-catalog.py
```

После обновления данных требуется повторно сверить точки, типы pistes (особенно snowtubing/nordic/training), расстояния и таблицу источников. Обычный `npm run build` сеть для исследования не использует и данные курортов не переинтерпретирует.

`vector-test-source.json` фиксирует реальный z14 OpenFreeMap MVT вне каталога. Маленький тестовый PBF сохранён в `tests/fixtures/world-forest.pbf`: семантические лесные полигоны, а не изображение. © OpenStreetMap contributors, ODbL 1.0; OpenFreeMap/OpenMapTiles.
