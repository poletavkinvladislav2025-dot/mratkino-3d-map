import './style.css';
import './mratkino-map.js';
document.querySelector('#app').innerHTML='<mratkino-map asset-base="'+import.meta.env.BASE_URL+'"></mratkino-map>';
