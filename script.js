// ---------- NAV ----------
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header.classList.add('bg-ink/90','backdrop-blur-md','border-inkline');
  } else {
    header.classList.remove('bg-ink/90','backdrop-blur-md','border-inkline');
  }
});

const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', () => mobileMenu.classList.add('hidden')));

// ---------- REVEAL ON SCROLL ----------
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// ---------- BOOKING STATE ----------
const booking = { serviceId: null, serviceName: null, price: null, duration: null, barberId: null, barberName: null, date: null, dateLabel: null, time: null };

function currency(n){ return '$' + n.toLocaleString('es-AR'); }

// Progress fade-bar (0 -> 8, filled in pairs per completed field)
function updateProgress(){
  const filled = [booking.serviceId, booking.barberId, booking.date, booking.time].filter(Boolean).length; // 0..4
  const onTicks = filled * 2; // 0,2,4,6,8
  const spans = document.querySelectorAll('#progressBar span');
  spans.forEach((s, i) => { s.className = i < onTicks ? 'on' : 'off'; });
  const label = document.getElementById('progressLabel');
  const labels = [
    'Guard 0 · Empezá eligiendo un servicio',
    'Guard 2 · Ahora elegí tu barbero',
    'Guard 4 · Elegí día y horario',
    'Guard 6 · Casi listo, elegí el horario',
    'Guard 8 · Completá tus datos y confirmá'
  ];
  label.textContent = labels[filled];
}

function updateSummary(){
  const box = document.getElementById('summaryBox');
  if (!booking.serviceId) { box.textContent = 'Elegí un servicio para empezar tu reserva.'; return; }
  let txt = booking.serviceName + ' · ' + currency(booking.price) + ' · ' + booking.duration;
  if (booking.barberName) txt += '  —  ' + booking.barberName;
  if (booking.dateLabel) txt += '  —  ' + booking.dateLabel;
  if (booking.time) txt += ' ' + booking.time + 'hs';
  box.innerHTML = '<span class="text-paper font-display uppercase tracking-wide text-sm">' + txt + '</span>';
  updateWaLink();
}

function updateWaLink(){
  let msg = 'Hola! Quiero reservar un turno en Fade Culture.';
  if (booking.serviceName) msg += ' Servicio: ' + booking.serviceName + '.';
  if (booking.barberName) msg += ' Barbero: ' + booking.barberName + '.';
  if (booking.dateLabel) msg += ' Día: ' + booking.dateLabel + '.';
  if (booking.time) msg += ' Horario: ' + booking.time + 'hs.';
  document.getElementById('waBookBtn').href = 'https://wa.me/5491158901234?text=' + encodeURIComponent(msg);
}
updateWaLink();

// ---------- SERVICE SELECTION (booking chips) ----------
function selectService(id, name, price, duration){
  booking.serviceId = id; booking.serviceName = name; booking.price = Number(price); booking.duration = duration;
  document.querySelectorAll('#serviceChips .chip').forEach(c => c.classList.toggle('selected', c.dataset.svc === id));
  updateProgress(); updateSummary();
}

document.querySelectorAll('#serviceChips .chip').forEach(chip => {
  chip.addEventListener('click', () => selectService(chip.dataset.svc, chip.dataset.name, chip.dataset.price, chip.dataset.duration));
});

// "Agendar este servicio" buttons on service cards
document.querySelectorAll('[data-book-service]').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('[data-service-card]');
    selectService(card.dataset.id, card.dataset.name, card.dataset.price, card.dataset.duration);
    document.getElementById('reservas').scrollIntoView({ behavior: 'smooth' });
  });
});

// ---------- BARBER SELECTION ----------
document.querySelectorAll('.barber-card').forEach(card => {
  card.addEventListener('click', () => {
    booking.barberId = card.dataset.barber; booking.barberName = card.dataset.name;
    document.querySelectorAll('.barber-card').forEach(c => c.classList.toggle('selected', c === card));
    updateProgress(); updateSummary();
  });
});

// ---------- DATES ----------
const dateChipsEl = document.getElementById('dateChips');
const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
const monthNames = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const days = [];

(function buildDates(){
  const today = new Date();
  for (let i = 0; i < 14; i++){
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  days.forEach((d, idx) => {
    const isSunday = d.getDay() === 0;
    const btn = document.createElement('button');
    const iso = d.toISOString().slice(0,10);
    const label = String(d.getDate()).padStart(2,'0') + ' ' + monthNames[d.getMonth()];
    btn.className = 'chip flex flex-col items-center justify-center rounded-xl px-4 py-3 min-w-[68px] font-display' + (isSunday ? ' closed' : '');
    btn.innerHTML = '<span class="text-[10px] tracking-widest text-gray-500">' + dayNames[d.getDay()] + '</span><span class="text-base mt-0.5">' + String(d.getDate()).padStart(2,'0') + '</span>';
    btn.dataset.iso = iso;
    btn.dataset.label = label;
    if (!isSunday){
      btn.addEventListener('click', () => {
        booking.date = iso; booking.dateLabel = label;
        document.querySelectorAll('#dateChips .chip').forEach(c => c.classList.toggle('selected', c === btn));
        booking.time = null;
        renderTimes(iso);
        updateProgress(); updateSummary();
      });
    }
    dateChipsEl.appendChild(btn);
  });
})();

// ---------- TIMES ----------
const allTimes = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

function hashStr(str){ let h = 0; for (let i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; } return h; }

function renderTimes(iso){
  const timeChipsEl = document.getElementById('timeChips');
  const hint = document.getElementById('timeHint');
  hint.classList.add('hidden');
  timeChipsEl.innerHTML = '';
  const seed = hashStr(iso);
  allTimes.forEach((t, i) => {
    const taken = ((seed >> i) & 1) === 1 && (i % 3 === 0 || i % 5 === 0);
    const btn = document.createElement('button');
    btn.className = 'chip rounded-xl py-3 font-display text-sm' + (taken ? ' taken' : '');
    btn.textContent = t;
    if (!taken){
      btn.addEventListener('click', () => {
        booking.time = t;
        document.querySelectorAll('#timeChips .chip').forEach(c => c.classList.toggle('selected', c === btn));
        updateProgress(); updateSummary();
      });
    }
    timeChipsEl.appendChild(btn);
  });
}

// ---------- CONFIRM ----------
document.getElementById('confirmBtn').addEventListener('click', () => {
  const errEl = document.getElementById('formError');
  const name = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();

  if (!booking.serviceId){ showError('Elegí un servicio para continuar.'); return; }
  if (!booking.barberId){ showError('Elegí un barbero para continuar.'); return; }
  if (!booking.date || !booking.time){ showError('Elegí día y horario para continuar.'); return; }
  if (!name || !phone){ showError('Completá tu nombre y WhatsApp para confirmar.'); return; }

  errEl.classList.add('hidden');

  const summary = booking.serviceName + ' con ' + booking.barberName + '<br>' + booking.dateLabel + ' a las ' + booking.time + 'hs<br>Total: ' + currency(booking.price);
  document.getElementById('modalSummary').innerHTML = 'Hola ' + name.split(' ')[0] + ', tu reserva quedó registrada:<br><br><span class="text-paper">' + summary + '</span><br><br>Te confirmamos por WhatsApp al ' + phone + '.';
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('confirmModal').classList.add('flex');
});

function showError(msg){
  const errEl = document.getElementById('formError');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.add('hidden');
  document.getElementById('confirmModal').classList.remove('flex');
});

// ---------- GALLERY LIGHTBOX ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');

document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const img = item.querySelector('img');
    lightboxImg.src = img.src.replace('w=800','w=1400');
    lightboxCaption.textContent = item.dataset.caption;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
  });
});
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
function closeLightbox(){ lightbox.classList.add('hidden'); lightbox.classList.remove('flex'); }
