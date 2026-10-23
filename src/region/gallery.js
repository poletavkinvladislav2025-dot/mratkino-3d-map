/** One compact gallery per card; a separate native dialog keeps about-dialog handlers intact. */
export class PlaceGallery{
 constructor(region){this.region=region;this.host=region.host;this.dialog=document.createElement('dialog');this.dialog.className='photo-viewer';this.dialog.setAttribute('aria-label','Фотографии места');this.host.$('dialog').after(this.dialog);this.dialog.addEventListener('click',e=>{if(e.target===this.dialog)this.dialog.close();});this.dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.step(e.key==='ArrowLeft'?-1:1);}});}
 mount(parent,p){
  this.dialog.close();this.photos=(p.photos||[]).filter(x=>x?.url&&!/^data:|transparent|spacer\.gif/i.test(x.url));
  if(p.photo)this.photos.unshift({url:this.host.url(p.photo),alt:p.name,credit:p.photoCredit});
  this.index=0;this.name=p.name;this.figure=document.createElement('figure');this.figure.className='place-gallery';this.figure.hidden=true;
  this.open=this.region.button('','Открыть фотографию крупно',()=>{this.large();this.dialog.showModal();});this.open.className='gallery-open';
  this.image=document.createElement('img');this.image.decoding='async';this.open.append(this.image);
  const nav=document.createElement('div');nav.className='gallery-nav';this.counter=document.createElement('span');this.counter.setAttribute('aria-live','polite');
  nav.append(this.region.button('‹','Предыдущая фотография',()=>this.step(-1)),this.counter,this.region.button('›','Следующая фотография',()=>this.step(1)));
  this.caption=document.createElement('figcaption');this.figure.append(this.open,nav,this.caption);parent.append(this.figure);this.nav=nav;this.update();
 }
 step(direction){if(!this.photos.length)return;this.index=(this.index+direction+this.photos.length)%this.photos.length;this.update();if(this.dialog.open)this.large();}
 update(){
  const photo=this.photos[this.index];if(!photo){this.figure.hidden=true;return;}
  const token=this.token=(this.token||0)+1;this.figure.hidden=true;this.image.onload=()=>{if(token!==this.token)return;if(this.image.naturalWidth<=2||this.image.naturalHeight<=2){this.reject(photo);return;}this.figure.hidden=false;};this.image.onerror=()=>{if(token===this.token)this.reject(photo);};
  this.image.alt=photo.alt||this.name;this.image.src=this.host.url(photo.url);this.counter.textContent=`${this.index+1} / ${this.photos.length}`;this.nav.hidden=this.photos.length<2;this.caption.textContent=photo.credit||photo.author||'';
 }
 reject(photo){this.photos=this.photos.filter(p=>p!==photo);this.index=Math.min(this.index,Math.max(0,this.photos.length-1));this.update();}
 large(){
  const photo=this.photos[this.index];if(!photo)return;this.dialog.replaceChildren();
  const close=this.region.button('×','Закрыть фотографию',()=>this.dialog.close()),image=document.createElement('img'),caption=document.createElement('p');image.src=this.host.url(photo.url);image.alt=photo.alt||this.name;caption.textContent=[photo.alt||this.name,photo.credit||photo.author].filter(Boolean).join(' · ');
  const nav=document.createElement('div');nav.className='gallery-nav';nav.append(this.region.button('‹','Предыдущая фотография',()=>this.step(-1)),document.createTextNode(`${this.index+1} / ${this.photos.length}`),this.region.button('›','Следующая фотография',()=>this.step(1)));nav.hidden=this.photos.length<2;this.dialog.append(close,image,caption,nav);
 }
 dispose(){this.token++;this.dialog.remove();}
}
