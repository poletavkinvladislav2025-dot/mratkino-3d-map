"""Package the production site at ZIP root; do not publish to a hosting service."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
output=root/'deliverables/mratkino-web.zip';output.parent.mkdir(exist_ok=True)
with ZipFile(output,'w',compression=ZIP_DEFLATED,compresslevel=6) as archive:
    for path in sorted((root/'dist').rglob('*')):
        if path.is_file():archive.write(path,path.relative_to(root/'dist'))
    archive.write(root/'DATA_SOURCES.md','DATA_SOURCES.md')
    archive.writestr('README-DEPLOY.txt','Мраткино — живая 3D-карта.\nЗагрузите содержимое этого архива на статический HTTPS-хостинг, сохранив структуру папок. index.html должен быть в корне выбранного URL. Серверная часть и API-ключи не нужны. Файлы .mjs необходимо отдавать как JavaScript; стандартные современные статические хостинги это поддерживают.\nВставьте iframe из tilda-iframe.txt в T123 и замените YOUR-MAP-HOST фактическим HTTPS-адресом. Разрешите fullscreen.\nДанные OSM не подтверждены курортом; Ю5 отсутствует; Ю3 имеет конфликт name/ref. См. DATA_SOURCES.md и live/licenses/.\n')
    archive.write(root/'deliverables/tilda-iframe.txt','tilda-iframe.txt')
with ZipFile(output) as archive:
    assert archive.testzip() is None
    names=archive.namelist()
    assert 'index.html' in names and 'live/manifest.json' in names
    assert not any(name.endswith(('.tif','.blend')) for name in names)
print('Production ZIP verified:',round(output.stat().st_size/1024/1024,2),'MB')
